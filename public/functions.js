const electron = require("electron");
const ipc = electron.ipcRenderer;
var crypto = require('crypto');
var createHash = require('create-hash');
var cryptoBrowser = require('browserify-aes');
var $ = require('jquery');
var genRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') /** convert to hexadecimal format */
        .slice(0, length);   /** return required number of characters */
};

var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

function sha1(input) {
    return createHash('sha1').update(input).digest();
}

function passwordDeriveBytes(password, salt, iterations = 100, len = 32) {
    var key = Buffer.from(password + salt);
    for (var i = 0; i < iterations; i++) {
        key = sha1(key);
    }
    if (key.length < len) {
        var hx = passwordDeriveBytes(password, salt, iterations - 1, 20);
        for (var counter = 1; key.length < len; ++counter) {
            key = Buffer.concat([key, sha1(Buffer.concat([Buffer.from(counter.toString()), hx]))]);
        }
    }
    return Buffer.alloc(len, key);
}

function getPassAndSalt() {
    return ipc.sendSync("askingForPassAndSalt");
}


function encrypt(data) {
    var array = getPassAndSalt();
    var pass = array[0];
    var salt = array[1];
    var key = passwordDeriveBytes(pass, salt);
    key.toString('hex');
    var iv = 'aw90rela942f65u2';
    var cipher = cryptoBrowser.createCipheriv('aes-256-cbc', key, Buffer.from(iv));
    var part1 = cipher.update(data, 'utf8');
    var part2 = cipher.final();
    var encrypted = Buffer.concat([part1, part2]).toString('base64');
    return encrypted;
}


function decrypt(encryptedData) {
    var array = getPassAndSalt();
    var pass = array[0];
    var salt = array[1];
    var key = passwordDeriveBytes(pass, salt);
    key.toString('hex');
    var iv = 'aw90rela942f65u2';
    var decipher = cryptoBrowser.createDecipheriv('aes-256-cbc', key, Buffer.from(iv));
    var decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final();
    return decrypted;
}

var rowID;
function getCardRowID(cn) {
    return ipc.sendSync("askingForCardRowID", cn);
}
function getAccRowID(wb) {
    return ipc.sendSync("askingForAccRowID", wb);
}
var data = [];
function edit_row(name, no) {
    
    if (name === "cards") {
        document.getElementById("edit_button" + no).style.display = "none";
        document.getElementById("save_button" + no).style.display = "block";
        var cardName = document.getElementById("cardName_row" + no);
        var cardNum = document.getElementById("cardNum_row" + no);
        var secNum = document.getElementById("secNum_row" + no);
        var address = document.getElementById("address_row" + no);
        var exp = document.getElementById("exp_row" + no);
        var cardName_data = cardName.innerHTML;
        rowID = getCardRowID(cardName_data);
        var cardNum_data = cardNum.innerHTML;
        var secNum_data = secNum.innerHTML;
        var address_data = address.innerHTML;
        var exp_data = exp.innerHTML;
        cardName.innerHTML = "<input type='text' id='cardName_text" + no + "' value='" + cardName_data + "'>";
        cardNum.innerHTML = "<input type='text' id='cardNum_text" + no + "' value='" + cardNum_data + "'>";
        secNum.innerHTML = "<input type='text' id='secNum_text" + no + "' value='" + secNum_data + "'>";
        address.innerHTML = "<input type='text' id='address_text" + no + "' value='" + address_data + "'>";
        exp.innerHTML = "<input type='text' id='exp_text" + no + "' value='" + exp_data + "'>";
        data = [cardName_data, cardNum_data, secNum_data, address_data, exp_data];
       
        
    } else {
        console.log("no", no);
        document.getElementById("edit_button_w" + no).style.display = "none";
        document.getElementById("save_button_w" + no).style.display = "block";

        var website = document.getElementById("website_row" + no);
        var email = document.getElementById("email_row" + no);
        var password = document.getElementById("password_row" + no);
        var website_data = website.innerHTML;
        rowID = getAccRowID(website_data);
        var email_data = email.innerHTML;
        var password_data = password.innerHTML;
        website.innerHTML = "<input type='text' id='website_text" + no + "' value='" + website_data + "'>";
        email.innerHTML = "<input type='text' id='email_text" + no + "' value='" + email_data + "'>";
        password.innerHTML = "<input type='text' id='password_text" + no + "' value='" + password_data + "'>";
        data =[website_data, email_data, password_data];
        
    }
}

function updateDB(arr) {
    return ipc.sendSync("updatingDB", arr);
}

function save_row(name, no) {
    if (name === "cards") {
        var cardName_val = document.getElementById("cardName_text" + no).value;
        var cardNum_val = document.getElementById("cardNum_text" + no).value;
        var secNum_val = document.getElementById("secNum_text" + no).value;
        var address_val = document.getElementById("address_text" + no).value;
        var exp_val = document.getElementById("exp_text" + no).value;
        var cardArrayUpdate = ["cards", rowID, cardName_val, encrypt(cardNum_val), encrypt(secNum_val), encrypt(exp_val), address_val];

        if(updateDB(cardArrayUpdate) !== false){
        document.getElementById("cardName_row" + no).innerHTML = cardName_val;
        document.getElementById("cardNum_row" + no).innerHTML = cardNum_val;
        document.getElementById("secNum_row" + no).innerHTML = secNum_val;
        document.getElementById("address_row" + no).innerHTML = address_val;
        document.getElementById("exp_row" + no).innerHTML = exp_val;

        document.getElementById("edit_button" + no).style.display = "block";
        document.getElementById("save_button" + no).style.display = "none";
        rowID = null;
        }else{
            alert("Duplicate entries not allowed");
            document.getElementById("edit_button" + no).style.display = "block";
            document.getElementById("save_button" + no).style.display = "none";
            document.getElementById("cardName_row" + no).innerHTML = data[0];
            document.getElementById("cardNum_row" + no).innerHTML = data[1];
            document.getElementById("secNum_row" + no).innerHTML = data[2];
            document.getElementById("address_row" + no).innerHTML = data[3];
            document.getElementById("exp_row" + no).innerHTML = data[4];
    
        }
      
    } else {
        var website_val = document.getElementById("website_text" + no).value;
        var email_val = document.getElementById("email_text" + no).value;
        var password_val = document.getElementById("password_text" + no).value;
        var accArrayUpdate = ["accounts", rowID, website_val, encrypt(email_val), encrypt(password_val)];
        if(updateDB(accArrayUpdate) !==false){
        document.getElementById("website_row" + no).innerHTML = website_val;
        document.getElementById("email_row" + no).innerHTML = email_val;
        document.getElementById("password_row" + no).innerHTML = password_val;

        document.getElementById("edit_button_w" + no).style.display = "block";
        document.getElementById("save_button_w" + no).style.display = "none";
        
        rowID = null;
        }else{
            alert("Duplicate entries not allowed");
            document.getElementById("edit_button_w" + no).style.display = "block";
        document.getElementById("save_button_w" + no).style.display = "none";
        document.getElementById("website_row" + no).innerHTML = data[0];
        document.getElementById("email_row" + no).innerHTML = data[1];
        document.getElementById("password_row" + no).innerHTML = data[2];
        }
    }
}

function delete_row(name, no) {
    if (name === "cards") {
        var r = confirm("Click OK to confirm delete");
        if (r === true) {
            var cardName = document.getElementById("cardName_row" + no).innerHTML;
            rowID = getCardRowID(cardName);
            ipc.sendSync("DeleteCardRow", rowID);
            document.getElementById("row" + no + "").outerHTML = "";
            rowID = null;
        }
    } else {
        var r2 = confirm("Click OK to confirm delete");
        if (r2 === true) {
            var accName = document.getElementById("website_row" + no).innerHTML;
            rowID = getAccRowID(accName);
            ipc.sendSync("DeleteAccRow", rowID);
            document.getElementById("row_w" + no + "").outerHTML = "";
            rowID = null;
        }
    }

}

function add_row(name) {
    if (name === "cards") {
        var new_cardName = document.getElementById("new_cardName").value;
        var new_cardNum = document.getElementById("new_cardNum").value;
        var new_secNum = document.getElementById("new_secNum").value;
        var new_address = document.getElementById("new_address").value;
        var new_exp = document.getElementById("new_exp").value;
        if (new_cardName.length > 0 && new_cardNum.length > 0 && new_secNum.length > 0 && new_address.length > 0) {
            var table = document.getElementById("Cards");
            var table_len = (table.rows.length) ;
            var encpryptedCardArray = [new_cardName, encrypt(new_cardNum), encrypt(new_secNum), encrypt(new_exp), new_address];
            if (ipc.sendSync("sendingNewEncryptedCard", encpryptedCardArray) !== false) {
                var row = table.insertRow(table_len).outerHTML = "<tr id='row" + table_len + "'><td id='cardName_row" + table_len + "'>" + new_cardName + "</td><td id='cardNum_row" + table_len + "'>" + new_cardNum
                    + "</td><td id='secNum_row" + table_len + "'>" + new_secNum + "</td><td id='exp_row" + table_len + "'>" + new_exp + "</td><td id='address_row" + table_len + "'>" + new_address + "</td><td><input type='button' id='edit_button" + table_len + "' value='Edit' class='edit' onclick='edit_row(\"cards\"," + table_len + ")'> <input type='button' id='save_button" + table_len + "' value='Save' class='save' onclick='save_row(\"cards\"," + table_len + ")'> <input type='button' value='Delete' class='delete' onclick='delete_row(\"cards\"," + table_len + ")'></td></tr>";

                document.getElementById("new_cardName").value = "";
                document.getElementById("new_cardNum").value = "";
                document.getElementById("new_secNum").value = "";
                document.getElementById("new_address").value = "";
                document.getElementById("new_exp").value = "";

                document.getElementById("edit_button" + table_len).style.display = "block";
                document.getElementById("save_button" + table_len).style.display = "none";
            } else {
                alert("Duplicate entries not allowed");
            }
        } else {
            alert("All fields must be filled to add a new entry");
        }
    } else {
        var new_website = document.getElementById("new_website").value;
        var new_email = document.getElementById("new_email").value;
        var new_password = document.getElementById("new_password").value;
        if (new_website.length > 0 && new_email.length > 0 && new_password.length > 0) {
            var table2 = document.getElementById("websites");
            var table_len2 = (table2.rows.length);
            var encpryptedArray = [new_website, encrypt(new_email), encrypt(new_password)];
            if (ipc.sendSync("sendingNewEncryptedWebsite", encpryptedArray) !== false) {
                var row2 = table2.insertRow(table_len2).outerHTML = "<tr id='row_w" + table_len2 + "'><td id='website_row" + table_len2 + "'>" + new_website + "</td><td id='email_row" + table_len2 + "'>" + new_email
                    + "</td><td id='password_row" + table_len2 + "'>" + new_password + "</td><td><input type='button' id='edit_button_w" + table_len2 + "' value='Edit' class='edit' onclick='edit_row(\"website\"," + table_len2 + ")'> <input type='button' id='save_button_w" + table_len2 + "' value='Save' class='save' onclick='save_row(\"website\"," + table_len2 + ")'> <input type='button' value='Delete' class='delete' onclick='delete_row(\"website\"," + table_len2 + ")'></td></tr>";



                document.getElementById("new_website").value = "";
                document.getElementById("new_email").value = "";
                document.getElementById("new_password").value = "";

                document.getElementById("edit_button_w" + table_len2).style.display = "block";
                document.getElementById("save_button_w" + table_len2).style.display = "none";
            } else {
                alert("Duplicate entries not allowed");
            }
        } else {
            alert("All fields must be filled to add a new entry");
        }
    }

}
