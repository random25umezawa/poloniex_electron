const Poloniex = require("poloniex");
const key_set = require("./src/key_set.json");
var polo = new Poloniex(key_set.key,key_set.secret);
const sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("./db/trade_data.sqlite3");

createTable(
	"chart_data",
	[
		["pair_id","INTEGER"],
		["date","INTEGER"],
		["high","REAL"],
		["low","REAL"],
		["open","REAL"],
		["close","REAL"],
		["volume","REAL"],
		["quote_volume","REAL"],
		["weighted_average","REAL"]
	],
	["pair_id","date"]
);
showTables().then(function(result) {
	return new Promise(function(resolve,reject) {
		if(!result["chart_data"]) {
			createTable().then(function() {
				resolve();
			})
		}
		else resolve();
	});
}).then(function() {
	db.close();
});

function showTables() {
	return new Promise(function(resolve,reject) {
		db.all("select * from sqlite_master where type='table'",function(err,res) {
			var tables = {};
			if(res) {
				for(var table of res) {
					tables[table.name] = true;
				}
			}
			resolve(tables);
		});
	})
}

function createTable(_table_name, _table_cols, _table_primary=[]) {
	var _column_strings = [];
	for(var colomn of _table_cols) {
		_column_strings.push(colomn.join(" "));
	}
	_column_strings.push(`PRIMARY KEY (${_table_primary.join(",")})`);
	return new Promise(function(resolve,reject) {
		db.run(`CREATE TABLE ${_table_name} (${_column_strings.join(",")})`);
		resolve();
	});
}
