const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;

const path = require("path");
const url = require("url");

const sqlite3 = require("sqlite3").verbose();
//var db = new sqlite3.Database("../db/trade_data.sqlite3");
const Poloniex = require("poloniex");
const key_set = require("./key_set.json");
var polo = new Poloniex(key_set.key, key_set.secret);

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

ipc.on("getTradeHistory",function(event,arg) {
	if(!arg.pair) return;
	polo.getTradeHistory(function(result) {
		event.sender.send("returnTradeHistory",result);
	},arg.pair);
});

ipc.on("getChartData",function(event,arg) {
	if(!arg.pair) return;
	polo.getChartData(function(result) {
		event.sender.send("returnChartData",result);
	},arg.pair);
});
