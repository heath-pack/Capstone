const { BrowserWindow, ipcMain } = require("electron")
const remote = require('electron');
const app = remote.app;
const path = require('path');
const dev = require('electron-is-dev');;

const pathname = dev ? path.join(__dirname, '/../extraResources/database.sqlite')
	: path.join(app.getPath('appData'), '..', 'Local', 'Programs', 'capstone', 'resources', 'extraResources', 'database.sqlite');

var knex = require("knex")({
	client: "sqlite",
	connection: {

		filename: pathname,
	},
	useNullAsDefault: true,
});

app.on("ready", () => {
	let mainWindow = new BrowserWindow({ width: 900, height: 680 })
	mainWindow.loadURL(dev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/html/signin.html')}`);
	mainWindow.on('closed', () => mainWindow = null);
	mainWindow.webContents.openDevTools();
	mainWindow.once("ready-to-show", () => { mainWindow.show() })
	var userID;

	ipcMain.on("DataDisplayLoaded", () => {
		let result = knex("Users").where({ ID: userID }).select("FirstName", "LastName");
		result.then((data) => {
			mainWindow.webContents.send("dataSent", data);
		})
	});


	ipcMain.on("clickedLogin", function (event, data) {
		var name = data[0];
		var pass = data[1];
		let result = knex("Users").where({ UserName: name, Password: pass }).select("ID");
		result.then((ID) => {
			if (ID.length === 1) {
				userID = ID[0].ID;
				event.returnValue = true;

			} else {
				event.returnValue = false;
			}
		})
	});

	ipcMain.on("clickedSignUp", function (event, data) {
		var fName = data[0];
		var lName = data[1];
		var name = data[2];
		var email = data[3];
		var phone = data[4];
		var pass = data[5];
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
		knex("Users").insert({ FirstName: fName, LastName: lName, UserName: name, Email: email, Phone: phone, Password: pass }).then(otherDataResults => {
			console.log();
		  });
		 let user = knex("Users").where({ UserName: name, Password: pass }).select("ID");
		 user.then((theID) =>{
			userID= theID[0].ID
		 })
		 event.returnValue = true;
	});
});



app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});