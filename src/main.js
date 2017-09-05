const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;

const path = require("path");
const url = require("url");

const sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(".db.sqlite3");
const request = require("request");
const jssha = require("jssha");

const key_set = require("./key_set.json");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({width:800,height:600});

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, "index.html"),
		protocol: "file",
		slashes: true
	}));

	mainWindow.webContents.openDevTools();

	mainWindow.on("closed",function() {
		mainWindow = null;
	});
}

app.on("ready",createWindow);

app.on("window-all-closed",function() {
	if(process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate",function() {
	if(mainWindow === null) {
		createWindow();
	}
});

ipc.on("mes",function(event,arg) {
	var postdata = {command:"returnChartData",currencyPair:"BTC_STEEM",start:"1504538200",end:"9999999999",period:"1800"};
	//var postdata = {command:"returnBalances"};
	postdata["nonce"] = (new Date()).getTime();
	var temp_stringarr = [];
	for(var key in postdata) {
		temp_stringarr.push(key+"="+postdata[key]);
	}
	var poststring = temp_stringarr.join("&");
	var hashed = new jssha("SHA-512","TEXT");
	hashed.setHMACKey(key_set.secret,"TEXT");
	hashed.update(poststring);
	//console.log(hashed.getHMAC("HEX"));
	console.log(key_set.key);
	console.log(key_set.secret);
	console.log(postdata);
	console.log(poststring);
	console.log("https://poloniex.com/tradingApi?"+poststring);
	console.log(hashed.getHMAC("HEX"));

	var req = request({
			url: "https://poloniex.com/tradingApi",
			form: postdata,
			//url: "https://poloniex.com/public?command=returnChartData&currencyPair=BTC_STEEM&start=1504538200&end=9999999999&period=1800"
			method: "POST",
			headers: {
				//"User-Agent": 'Mozilla/4.0 (compatible; Poloniex nodejs bot;)',
				"Key": key_set.key,
				"Sign": hashed.getHMAC("HEX")
			}
		}
		,function(error,response,body) {
		console.log(error);
		//console.log(response);
		console.log(body);

		event.sender.send("rep",response);
	});
	//console.log(req);
});
