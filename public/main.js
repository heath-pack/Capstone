const { BrowserWindow, ipcMain } = require("electron");
const app = require('electron').app;
const path = require('path');
const dev = require('electron-is-dev');

var crypto = require('crypto');

/**
 * Creates a random 16 bit salt
 */
function salt() {
	var length = 16;
	return crypto.randomBytes(Math.ceil(length / 2))
		.toString('hex') /** convert to hexadecimal format */
		.slice(0, length);   /** return required number of characters */
};
/**
 * 
 * @param {The password to be hashed} password 
 * @param {The salt to be added to the password before hashing} salt 
 */
function hash(password, salt) {
	var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
	hash.update(password);
	var value = hash.digest('hex');
	return {
		salt: salt,
		passwordHash: value
	};
};
/**
 * Makes sure the path is correct given the context of decelopmental or distribution
 */
const pathname = dev ? path.join(__dirname, '/../extraResources/database.sqlite')
	: path.join(__dirname, '..', '..', 'extraResources', 'database.sqlite');
/**
 * Initializes a knex object, which is used to read/write from the database.
 */
var knex = require("knex")({
	client: "sqlite",
	connection: {

		filename: pathname,
	},
	useNullAsDefault: true,
});
/**
 * starts the app and has all of the communcation between processes 
 */
app.on("ready", () => {
	let mainWindow = new BrowserWindow({ width: 1400, height: 800, icon: path.join(__dirname, 'icon.jpg'), title: "Local-Lock" });
	mainWindow.loadURL(dev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/html/signin.html')}`);
	mainWindow.on('closed', () => mainWindow = null);

	mainWindow.once("ready-to-show", () => { mainWindow.show() })
	mainWindow.setMenu(null);

	var userID;
	/**
	 * waits for the DataDisplayLoaded message from the rendere and then querys the database and returns the website and card tables
	 */
	ipcMain.on("DataDisplayLoaded", () => {
		let result = knex("Accounts").where({ ID: userID }).column("Account_Name", "Account_email", "Account_Password").select().orderBy("Row_ID");
		result.then((data) => {
			var data2 = data;
			mainWindow.webContents.send("accDataSent", data2);
		})
		let result2 = knex("Cards").where({ ID: userID }).column("Card_Nickname", "Card_Number", "Security_Code", "Exp_Date", "Address").select().orderBy("Row_ID");
		result2.then((data) => {
			mainWindow.webContents.send("cardDataSent", data);
		})
	});

	/**
	 * waits until the user clicks log in and begins user authentification
	 */
	ipcMain.on("clickedLogin", function (event, data) {
		var name = data[0];
		var pass = data[1];
		let userSalt = knex("Users").where({ UserName: name }).select("Salt");
		var salty = "";
		var userHashedPass = "";
		userSalt.then((s) => {
			if (s.length === 1) {
				salty = s[0].Salt;
			} else {
				event.returnValue = false;
			}
		})
		/**
		 * confirms username and passowrd match hasehed pass and that the user exists or returns false and prompts user to try again
		 */
		let userPass = knex("Users").where({ UserName: name }).select("Password");
		userPass.then((up) => {
			if (up.length === 1) {
				userHashedPass = up[0].Password;
				if (hash(pass, salty).passwordHash === userHashedPass) {
					let result = knex("Users").where({ UserName: name, Password: userHashedPass }).select("ID");
					result.then((ID) => {
						if (ID.length === 1) {
							userID = ID[0].ID;
							event.returnValue = true;
						} else {
							event.returnValue = false;
						}
					})
				}
				else {
					event.returnValue = false;
				}
			}
			else {
				event.returnValue = false;
			}
		})
	});
	/**
	 * takes the data from the create account page and adds the user to the database if it doesnt exist already
	 */
	ipcMain.on("clickedSignUp", function (event, data) {
		var fName = data[0];
		var lName = data[1];
		var name = data[2];
		var email = data[3];
		var phone = data[4];
		var pass = data[5];
		var pin = data[6];
		let result1 = knex("Users").where({ UserName: name }).select("ID");
		let result2 = knex("Users").where({ Email: email }).select("ID");
		result1.then((theID) => {
			if (theID.length > 0) {
				event.returnValue = false;
			}
		})
		result2.then((theID) => {
			if (theID.length > 0) {
				event.returnValue = false;
			}
		})
		var saltPass = salt();
		var hashedPass = hash(pass, saltPass);

		var saltPin = salt();
		var hashedPin = hash(pin, saltPin);

		knex("Users").insert({ FirstName: fName, LastName: lName, UserName: name, Email: email, Phone: phone, Password: hashedPass.passwordHash, Salt: saltPass, Pin: hashedPin.passwordHash, PinSalt: saltPin }).then(otherDataResults => { });
		let user = knex("Users").where({ UserName: name, Password: hashedPass.passwordHash }).select("ID");
		user.then((theID) => {
			userID = theID[0].ID
		})
		event.returnValue = true;
	});
	/**
	 * checks that the pin is correct as well, snd form of authentifiaction
	 */
	ipcMain.on("TypedPin", function (event, data) {
		var typedPin = data;
		let userPin = knex("Users").where({ ID: userID });
		userPin.then((that) => {
			var pin = that[0].Pin;
			var pinsalt = that[0].PinSalt;
			if (hash(typedPin, pinsalt).passwordHash === pin) {
				event.returnValue = true;
			}
			else {
				event.returnValue = false;
			}
		})
	})
	/**
	 * asks for pass and salt for encryption and decryption
	 */
	ipcMain.on("askingForPassAndSalt", function (event) {
		let userQ = knex("Users").where({ ID: userID });
		userQ.then((user) => {
			var hashedPass = user[0].Password;
			var passSalt = user[0].Salt;

			var array = [hashedPass, passSalt];
			event.returnValue = array;

		})
	})
	/**
	 * adds new card from user entry to the database after its encrypted
	 */
	ipcMain.on("sendingNewEncryptedCard", function (event, data) {
		var isUnique = true;
		var v = knex("Cards").insert({ ID: userID, Card_Nickname: data[0], Card_Number: data[1], Security_Code: data[2], Exp_Date: data[3], Address: data[4] }).then(otherDataResults => { }).catch(function (error) { isUnique = false });
		v.then((x) => {
			if (isUnique) {
				event.returnValue = true;
			} else {
				event.returnValue = false;
			}
		});
	})
	/**
	 * adds new website from user entry to the database after its encrypted
	 */
	ipcMain.on("sendingNewEncryptedWebsite", function (event, data) {
		var isUnique = true;
		var v = knex("Accounts").insert({ ID: userID, Account_Name: data[0], Account_email: data[1], Account_Password: data[2] }).then(otherDataResults => { }).catch(function (error) { isUnique = false });
		v.then((x) => {
			if (isUnique) {
				event.returnValue = true;
			} else {
				event.returnValue = false;
			}
		});

	})
	/**
	 * gets rowID to help with indexing the html table
	 */
	ipcMain.on("askingForCardRowID", function (event, data) {
		var R = knex("Cards").where({ Card_Nickname: data }).select("Row_ID");
		R.then((x) => {
			event.returnValue = x[0].Row_ID;
		})
	})
	/**
	 * gets rowID to help with indexing the html table
	 */
	ipcMain.on("askingForAccRowID", function (event, data) {
		var R = knex("Accounts").where({ Account_Name: data }).select("Row_ID");
		R.then((x) => {
			event.returnValue = x[0].Row_ID;

		})

	})
	/**
	 * updates db after the user adds
	 */
	ipcMain.on("updatingDB", function (event, data) {
		var isUnique = true;
		if (data[0] === "cards") {
			var v = event.returnValue = knex("Cards").where({ Row_ID: data[1] }).update({ Card_Nickname: data[2], Card_Number: data[3], Security_Code: data[4], Exp_Date: data[5], Address: data[6] }).then(otherDataResults => { }).catch(function (error) { isUnique = false });
			v.then((x) => {
				if (isUnique) {
					event.returnValue = true;
				} else {
					event.returnValue = false;
				}
			})
		} else {
			var c = knex("Accounts").where({ Row_ID: data[1] }).update({ Account_Name: data[2], Account_email: data[3], Account_Password: data[4] }).then(otherDataResults => { }).catch(function (error) { isUnique = false });
			c.then((x) => {
				if (isUnique) {
					event.returnValue = true;
				} else {
					event.returnValue = false;
				}
			})
		}
	})
	/**
	 * deletes row
	 */
	ipcMain.on("DeleteCardRow", function (event, data) {
		event.returnValue = knex("Cards").where({ Row_ID: data }).del().then(otherDataResults => { });
	})
	/**
	 * deletes row
 	 */
	ipcMain.on("DeleteAccRow", function (event, data) {
		event.returnValue = knex("Accounts").where({ Row_ID: data }).del().then(otherDataResults => { });
	})

	var promptWindow;
	var promptOptions;
	var promptAnswer;

	// Creating the dialog window

	function promptModal(parent, options, callback) {
		promptOptions = options;
		promptWindow = new BrowserWindow({
			alwaysOnTop: true,
			frame: false,
			width: 300, height: 105,
			'parent': parent,
			'show': false,
			'modal': true,
			'alwaysOnTop': true,
			'title': options.title,
			'autoHideMenuBar': true,
			'webPreferences': {
				"nodeIntegration": true,
				"sandbox": false
			}
		});
		promptWindow.on('closed', () => {
			promptWindow = null
			callback(promptAnswer);
		})

		// Load the HTML dialog box
		promptWindow.loadURL(dev ? path.join(__dirname, "/html/prompt.html") : path.join(__dirname, "../build/html/prompt.html"))
		promptWindow.once('ready-to-show', () => { promptWindow.show() })
	}

	// Called by the dialog box to get its parameters

	ipcMain.on("openDialog", (event, data) => {
		event.returnValue = JSON.stringify(promptOptions, null, '')
	})

	// Called by the dialog box when closed

	ipcMain.on("closeDialog", (event, data) => {
		promptAnswer = data
	})

	// Called by the application to open the prompt dialog

	ipcMain.on("prompt", (event, notused) => {
		promptModal(mainWindow, {
			"title": "Enter your 6 digit pin",
			"label": "Pin",
			"value": "",
			"ok": "Submit"
		},
			function (data) {
				event.returnValue = data
			}
		);
	});
});


/**
 * kills the app when the window is closed
 */
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});