const Poloniex = require("poloniex");
const key_set = require("./src/key_set.json");
var polo = new Poloniex(key_set.key,key_set.secret);
const sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database("./db/trade_data.sqlite3");
var periods = [86400,14400,7200,1800,900,300];

showTables().then(function(result) {
	console.log("Now tables:",result);
	return new Promise(function(resolve,reject) {
		db.serialize(function() {
			if(!result["chart_data"]) {
				console.log("--: Create table 'chart_data'");
				db.run("CREATE TABLE chart_data (pare_id INTEGER, date INTEGER, high REAL, low REAL, open REAL, close REAL, volume REAL, quote_volume REAL, weighted_average REAL, period INTEGER, PRIMARY KEY(pare_id, date))");
				db.run("CREATE INDEX pare_id_index on chart_data (pare_id)");
				db.run("CREATE INDEX date_index on chart_data (date)");
				db.run("CREATE INDEX period_index on chart_data (period)");
			}else {
				console.log("OK: Table 'chart_data' exists.");
			}
			if(!result["pairs"]) {
				console.log("--: Create table 'pairs'");
				db.run("CREATE TABLE pairs (pair_id INTEGER PRIMARY KEY AUTOINCREMENT, pair_name TEXT, is_exists INTEGER, first_time INTEGER, last_time INTEGER)");
				db.run("CREATE INDEX name_index on pairs (pair_name)");
			}else {
				console.log("OK: Table 'pairs' exists.");
			}
			resolve();
		})
	});
}).then(function() {
	console.log("Check pairs from ticker.")
	return new Promise(function(resolve,reject) {
		polo.getTicker(function(result) {
			var _temp_pairs = [];
			for(var pair in result) {
				_temp_pairs.push(`('${pair}')`);
			}
			//console.log("Ticker:", _temp_pairs);
			db.serialize(function() {
				db.run(`INSERT OR IGNORE INTO pairs (pair_name) values ${_temp_pairs.join(",")}`);
				db.run(`UPDATE pairs set is_exists=0`);
				db.run(`UPDATE pairs set is_exists=1 WHERE pair_name IN (${_temp_pairs.join(",")})`);
				db.all("SELECT * FROM pairs WHERE is_exists=1",function(err,res) {
					resolve(res);
				});
			});
		});
	});
}).then(function(pairs) {
	console.log("DB pairs getted. Update...");
	var now_time = 0;
	return Promise.resolve(0).then(function loop(i) {
		return new Promise(function(resolve,reject) {
			if(i<pairs.length && i<1) {
				var pair = pairs[i];
				console.log(pair);
				var now_time = Math.floor(+new Date()/1000);
				console.log(i,now_time,pair.last_time,now_time-pair.last_time);
				var start = 0;
				var end = 2147483647;
				if(pair.last_time) start = pair.last_time;
				if(now_time-start>=86400) {
					polo.getChartData(function(result) {
						if(result.length>0) {
							db.serialize(function() {
								var first_time = 2147483647;
								var last_time = 0;
								var values = [];
								for(var tick of result) {
									first_time = Math.min(first_time,tick.date);
									last_time = Math.max(last_time,tick.date);
									let period = periods[periods.length-1];
									for(var temp_period of periods) {
										if(tick.date%temp_period==0) {
											period = temp_period;
											break;
										}
									}
									values.push(`(${[pair.pair_id,tick.date,tick.high,tick.low,tick.open,tick.close,tick.volume,tick.quoteVolume,tick.weightedAverage,period].join(",")})`);
								}
								if(pair.first_time) first_time = Math.min(first_time,pair.first_time);
								if(pair.last_time) last_time = Math.max(last_time,pair.last_time);
								console.log(`DataLength: ${values.length} , first_time: ${first_time}, last_time: ${last_time}`);
								db.run(`INSERT OR IGNORE INTO chart_data values ${values.join(",")}`);
								db.run(`UPDATE pairs SET first_time=${first_time}, last_time=${last_time} WHERE pair_id=${pair.pair_id}`);
								setTimeout(function(){resolve(i+1)},1250);
							});
						}
						else resolve(i+1);
					},{currencyPair:pair.pair_name, period: 86400, start:start, end:end});
				}else resolve(i+1);
			}else reject();
		})
		.then(loop);
	});
}).catch(function() {
	db.get("select * from chart_data where pare_id=1 and date= 1400544000",function(err,res) {
		console.log(res);
	db.close();
	});
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

/*
function createTable(_table_name, _table_cols, _table_primary=[]) {
	var _column_strings = [];
	for(var colomn of _table_cols) {
		_column_strings.push(colomn.join(" "));
	}
	_column_strings.push(`PRIMARY KEY (${_table_primary.join(",")})`);
	return `CREATE TABLE ${_table_name} (${_column_strings.join(",")})`;
}
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
*/
