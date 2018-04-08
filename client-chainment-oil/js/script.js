//ssh server@tcplanner.chainment.com -p2003
//oppure ssh server@192.168.1.227
//psw chainmentrulez
//tmux -2 a -t benza
//nota: -2 = 256 colori, a = attach, -t = target
//

class Order {
	constructor(supplier,client, date, costPu, lit, total) {
		this.supplier = supplier;
		this.client = client;
		this.date = date;
		this.costPu = costPu;
		this.lit = lit;
		this.total = this.lit*this.costPu;
	}
	getOrderInfo(index) {
		var info;
		switch(index) {
			case 0:
				info = this.client;
				break;
			case 1:
				info = this.supplier;
			case 2:
				info = this.date;
				break;
			case 3:
				info = this.costPu;
				break;
			case 4:
				info = this.lit;
				break;
			case 5:
				info = this.total;
				break;
			default:
				info = null;
		}
		return info;
	}
}

var pusher = new Pusher('b76c8b879914f2448970', {
	cluster: 'eu'
});

class User {
	constructor(name) {
		this.name = name;
	}
	getName() {
		return this.name;
	}
}

var user = new User('rigomma');
var supplierContainer = new Array();
var suppliersChannelContainer = [];
var supplierTag = [];
var globalLitRequest;

class Supplier {
	constructor(name, logo, price, trend) {
		this.name = name;
		this.logo = logo;
		this.price = price;
		this.trend = trend;
		this.history = [];
		this.orders = this.history.length;
	}
	setName(newName) {
			this.name = newName;
	}
	changeLogo(url) {
		this.logo = url;
	}
	setPrice(newPrice) {
		this.price = newPrice;
	}
	setTrend (newTrend) {
		this.trend = newTrend;
	}
	incrementOrders () {
		this.orders++;
	}
	addOrder (newOrder) {
		this.incrementOrders();
		this.history.push(newOrder);
	}
	getLastOrder() {
		if(this.orders > 0)
		return this.history[this.orders-1];
	}
}

function getSupplier(supplierContainer, supplierName) {
	for(var i = 0; i < supplierContainer.length; i++) {
		if(supplierContainer[i].name == supplierName) {
			return supplierContainer[i];
		}
	}
	console.log('getSupplier(): supplier not found!');
	return null;
}

//################ ANDROID FUNCTIONS #######################3

function androidNotification() {
	Android.playNotification();
}

function infoSetupDB() {
	fetch('http://benza.chainment.com/orders', {method : 'GET', headers: {'Access-Control-Allow-Origin':''}}).then(
		function(response) {
			if (response.ok) {
				console.log('Server response success for GET orders, code: ' + response.status);
				return response.json();
			}
			throw new Error("'Server response error for GET orders, code: ' + console.log(response.status)");
		}).then(function(orders) {
					var orderContainer = [];
					for(var i = 0; i < orders.length; i++) {
						orderContainer.push(new Order(orders[i][1],
												  user.getName(),
										  		  orders[i][3],
										  		  orders[i][4],
										  	      orders[i][5],
												  orders[i][6]));
					}
					return orderContainer;
				}).then(
					function getSupplierDB(orderContainer) {
						fetch('http://benza.chainment.com/suppliers', {method : 'GET', headers: {'Access-Control-Allow-Origin':''} }).then(
							function(response) {
								if(response.ok) {
									console.log('Server response success for GET suppliers, code: ' + response.status);
									return response.json();
								}
								throw Error('Server response error for GET suppliers, code: ' + console.log(response.status));
							}
						//passes the response to next function
						).then(
							function(suppliers) {
								for(var i = 0; i < suppliers.length; i++) {
									supplierContainer.push(new Supplier(suppliers[i][0],
																		suppliers[i][1],
																		suppliers[i][2],
																		suppliers[i][3]));
									//binding channel
									var channel = pusher.subscribe(supplierContainer[i].name+'-channel');
									suppliersChannelContainer.push({key : supplierContainer[i].name, value: channel})
									//bind channels with supplier price info
									suppliersChannelContainer[i].value.bind('price-change', function(data) {
										console.log('fornitore: ' + data.fornitore + ', prezzo: ' + data.prezzo, 'trend: ' + data.trend);
										//write price and trend if not equal to old price or trend
										var stop = false;
										for(var i = 0; i < supplierContainer.length && !stop; i++) {
											if(supplierContainer[i].name == data.fornitore) {
												if(supplierContainer[i].price != data.prezzo) {
													supplierContainer[i].price = data.prezzo;
												}
												if(supplierContainer[i].trend != data.trend) {
													supplierContainer[i].trend = data.trend;
												}
												stop = true;
											}									
										}
										if(stop) {
											changePriceTrend(data.fornitore, data.prezzo, data.trend);
										} else  {
											console.log("supplier " + data.fornitore + " non trovato");
										}

									})
									suppliersChannelContainer[i].value.bind('order-confirm', function(data) {
										//print order info
										console.log('fornitore: ' + data.fornitore + 
													' prezzo: ' + data.prezzo +
													' trend: ' + data.trend +
													' tot: ' + data.totale +
													' data: ' + data.data + 
													' consegna ' + data.consegna +
													' commento ' + data.commento);
										//if supplier exists
										if(data.consegna) {
											//add the order
											//supp.addOrder(new Order(data.fornitore, data.cliente, data.data, data.prezzo, data.litri, data.totale));
											console.log('order-confirmed');
											orderConfirmedPopup(data);
											var confirmedSupplier = getSupplier(supplierContainer, data.fornitore);
											confirmedSupplier.addOrder(new Order(data.fornitore, 
																				 data.cliente, 
																				 data.data, 
																				 data.prezzo, 
																				 data.litri, 
																				 data.totale));
											addOrderToHistory(data);
											console.log('order-added');
											androidNotification();

										} else {
											console.log("order-rejected, select another supplier");
											$('#bid_button').text('SELECT SUPPLIER');
											var expiredEvent = new CustomEvent('timeExp', {detail: 'expired'});
											window.dispatchEvent(expiredEvent);
										}
									})
									for(var j = 0; j < orderContainer.length; j++) {
										if(orderContainer[j].supplier == supplierContainer[i].name) {
											supplierContainer[i].addOrder(orderContainer[j]);
										}
									}
								}
								return supplierContainer;
							}).then(
								function(supplierContainer) {
									createContent(supplierContainer);
									//add jquery file
                                    importJQuery();
									hideLoader();
									window.addEventListener('timeExp', function(e) {
										$('.supplier').css('pointerEvents', 'none');
										window.addEventListener('click', function(e) {
											//createOrderConfirmation();
											if($(e.target).hasClass('supplier_container')){
												createConfirmation(e.target.getAttribute('name'));
											}
										})
									});
									return checkPendingRequests(user.name);
                                })
					})
}

function hideLoader() {
	$('.hide').removeClass('hide');
	$('#cover').delay(1000).fadeOut("slow");
}

function createSupplierContainer(supplierContainer) {
	"use strict";
	var	main = document.getElementById('main_page'),
		collapsibleset,
		i;
	for (i = 0; i < supplierContainer.length; i++) {
		collapsibleset = document.createElement('div');
		collapsibleset.setAttribute('data-role', 'collapsibleset');
		collapsibleset.setAttribute('class', 'supplier_container');
		collapsibleset.setAttribute('id', supplierContainer[i].name);
		collapsibleset.setAttribute('name', supplierContainer[i].name);
		main.appendChild(collapsibleset);
	}
}

function createSupplierHistory(supplier) {
	var table = document.getElementById(supplier.name + '_history'),
		thead = document.createElement('thead'),
		trHead = document.createElement('tr'),
		tbody = document.createElement('tbody'),
		textArray = ['Date', 'Cost', 'Lit.', 'Total'],
		i;
	/*create table head*/
	tbody.setAttribute('id', supplier.name+'-table');
	for (i = 0; i < textArray.length; i++) {
		var th = document.createElement('th');
	th.textContent = textArray[i];
		trHead.appendChild(th);
	}
	thead.appendChild(trHead);
	/*create table body*/
	for (i = supplier.orders-1; i >= 0; i--) {
		var tr = document.createElement('tr'),
			j;
		tr.setAttribute('class', 'ui-shadow');
		for (j = 2; j <= textArray.length+2; j++) {
			var td = document.createElement('td');
			if (typeof supplier.history[i].getOrderInfo(j) === typeof 0) {
				td.textContent = supplier.history[i].getOrderInfo(j).toString();
			} else {
				td.textContent = supplier.history[i].getOrderInfo(j);
			}
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
	table.appendChild(thead);
	table.appendChild(tbody);
}

function createSupplier(supplierContainer) {
	"use strict";
	createSupplierContainer(supplierContainer);
	var content, signSimbol, arrowColorClass, i, trendABS, arrow;
	for (i = 0; i < supplierContainer.length; i++) {
		if (supplierContainer[i].trend > 0) {
			signSimbol = '+';
			arrowColorClass = 'red';
			trendABS = supplierContainer[i].trend;
			arrow = '▲';
		} else {
			signSimbol = '-';
			arrowColorClass = 'green';
			trendABS = Math.abs(supplierContainer[i].trend);
			arrow = '▼';
		}
		content = '\
		<div data-role="collapsible" data-collapsed-icon="false" data-expanded-icon="false" class="supplier" name="' + supplierContainer[i].name + '">\
			<h3 name="' + supplierContainer[i].name + '">\
				<div class="ui-grid-b" name="' + supplierContainer[i].name + '">\
					<div class="ui-block-a supplier_logo_container"  name="' + supplierContainer[i].name + '">\
						<img src="' + supplierContainer[i].logo + '" alt="' + supplierContainer[i].name + '"class="supplier_logo"  name="' + supplierContainer[i].name + '">\
					</div>\
					<div class="ui-block-b"  name="' + supplierContainer[i].name + '">\
						<div class="ui-grid-b price_container"  name="' + supplierContainer[i].name + '">\
							<div class="ui-block-a price"  name="' + supplierContainer[i].name + '">\
								<p id="' + supplierContainer[i].name + '_price"  name="' + supplierContainer[i].name + '">' + supplierContainer[i].price + ' €</p>\
							</div>\
							<div class="ui-grid-b trend_container"  name="' + supplierContainer[i].name + '">\
								<div class="ui-block-a trend"  name="' + supplierContainer[i].name + '">\
									<p id="' + supplierContainer[i].name + '_trend"  name="' + supplierContainer[i].name + '">' + signSimbol + ' ' + trendABS + '</p>\
								</div>\
								<div class="ui-block-b trend_arrow ' + arrowColorClass + ' '+ supplierContainer[i].name +'_arrow"  name="' + supplierContainer[i].name + '">\
									<p  name="' + supplierContainer[i].name + '">' + arrow + '</p>\
								</div>\
							</div>\
						</div>\
					</div>\
					<div class="ui-block-c supplier_orders"  name="' + supplierContainer[i].name + '">\
						<p  name="' + supplierContainer[i].name + '">Total orders</p>\
						<p  name="' + supplierContainer[i].name + '" id="'+ supplierContainer[i].name +'-orders">' + supplierContainer[i].orders + '</p>\
					</div>\
				</div>\
			</h3>\
			<span class="supplier_history" name="' + supplierContainer[i].name + '">\
				<table data-role="table" class="ui-responsive supplier_history columntoggle" id="' + supplierContainer[i].name + '_history" name="' + supplierContainer[i].name + '"></table>\
			</span>\
		</div>';
		document.getElementById(supplierContainer[i].name).innerHTML = content;
		createSupplierHistory(supplierContainer[i]);
	}
}

function addOrderToHistory(order) {
	var tbody = document.getElementById(order.fornitore + '-table'),
		tr = document.createElement('tr');
	/*create table*/
	tr.setAttribute('class', 'ui-shadow');
	var b = document.createElement('b');
	b.setAttribute('class', 'ui-table-cell-label');
	var tdDate = document.createElement('td');
	b.textContent = 'Date';
	tdDate.appendChild(b);
	tdDate.textContent = order.data;
	tr.appendChild(tdDate);
	var tdPrice = document.createElement('td');
	b.textContent = 'Cost';
	tdPrice.appendChild(b);
	tdPrice.textContent = order.prezzo;
	tr.appendChild(tdPrice);
	var tdLiters = document.createElement('td');
	b.textContent = 'Lit.';
	tdLiters.appendChild(b);
	tdLiters.textContent = order.litri;
	tr.appendChild(tdLiters);
	var tdTotal = document.createElement('td');
	b.textContent = 'Total';
	tdTotal.appendChild(b);
	tdTotal.textContent = order.prezzo * order.litri;
	
	tr.appendChild(tdTotal);
	//add new order to client history
	tbody.appendChild(tr);
	var incOrders = $('#'+order.fornitore+'-orders').text();
	incOrders = parseInt(incOrders) + 1;
	$('#'+order.fornitore+'-orders').text(incOrders.toString());
}

function createGeneralHistory(supplierContainer) {
	var thead = document.createElement('thead'),
		trHead = document.createElement('tr'),
		tbody = document.createElement('tbody'),
		textArray = ['Supplier', 'Date', 'Cost', 'Lit.', 'Total'],
		i;
	/*create table head*/
	for (i = 0; i < textArray.length; i++) {
		var th = document.createElement('th');
		th.setAttribute('data-priority', '1');
		th.textContent = textArray[i];
		trHead.appendChild(th);
	}
	thead.appendChild(trHead);
	var table = document.getElementById('orders_history');
	table.appendChild(thead);
	/*create table tbody content*/
	for (i = 0; i < supplierContainer.length; i++) {
		for (var j = 0; j < supplierContainer[i].orders; j++) {
			var tr = document.createElement('tr');
			var tdSup = document.createElement('td');
			tdSup.textContent = supplierContainer[i].history[j].supplier.toUpperCase();
			var tdDat = document.createElement('td');
			tdDat.textContent = supplierContainer[i].history[j].date;
			var tdCost = document.createElement('td');
			tdCost.textContent = supplierContainer[i].history[j].costPu;
			var tdLit = document.createElement('td');
			tdLit.textContent = supplierContainer[i].history[j].lit;
			var tdTot = document.createElement('td');
			tdTot.textContent = supplierContainer[i].history[j].total;
			tr.appendChild(tdSup);
			tr.appendChild(tdDat);
			tr.appendChild(tdCost);
			tr.appendChild(tdLit);
			tr.appendChild(tdTot);
			tbody.appendChild(tr);
		}
	}
	table.appendChild(tbody);
}

function createLiterPopUp() {
	$('liters_popup').hide();
	var content = '\
	<form onsubmit="" method="get" action="null">\
		<div>\
			<h3>Insert Liters</h3>\
			<input type="number"min="0"step="1"name="user"id="input_liters" placeholder=" Insert amount..">\
			<input type="submit" onclick="confirmLiters()" data-inline="true"value="Start bid">\
		</div>\
	</form>';
	document.getElementById('liters_popup').innerHTML = content;
}

function confirmLiters() {
	var content;
	if(document.getElementById("input_liters").value > 0) {
		content = '\
    	<div data-role="popup" id="myPopupDialog">\
    		<div data-role="header">\
    			<h2>Confirmation</h2>\
    		</div>\
    		<div data-role="main" class="ui-content">\
    			<p>Do you really want to send a ' + document.getElementById("input_liters").value + ' liters request?</p>\
    			<a href="#" class="confirm-order ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-check ui-btn-icon-left" \
    			data-rel="back" onclick="sendOrder(' + document.getElementById("input_liters").value + ')">Accept</a>\
    			<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-back ui-btn-icon-left reject-order" \
    			data-rel="back">Delete</a>\
    	</div>';
	} else {
		content = '\
    	<div data-role="popup" id="myPopupDialog">\
    		<div data-role="header">\
    			<h2>Error!</h2>\
    		</div>\
    		<div data-role="main" class="ui-content">\
    			<p>Wrong quantity, please make a different order.</p>\
    			<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-delete ui-btn-icon-left" \
    			data-rel="back">back</a>\
    	</div>';
	}
	globalLitRequest = document.getElementById("input_liters").value;
	document.getElementById('liters_popup').innerHTML = content;
}

function importJQueryforWeb() {
   $.getScript("jquery/jquery.min.js", function() {
		$.getScript("jquery/jquery.mobile-1.4.5.min.js", function() {
				console.log("jq mobile loaded");
		});
	});
}

function createConfirmation(supplier) {
	var content = '\
    	<div data-role="popup" id="myPopupDialog">\
    		<div data-role="header">\
    			<h2>Confirmation</h2>\
    		</div>\
    		<div data-role="main" class="ui-content">\
    			<p>Do you really want to confirm the order to ' + supplier.toUpperCase() + '?</p>\
    			<a href="#" class="confirm-order ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-check ui-btn-icon-left" \
    			data-rel="back" onclick="create_New_Order('+supplier+')">Accept</a>\
    			<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-back ui-btn-icon-left reject-order" \
    			data-rel="back">Delete</a>\
    	</div>';
    $('#bid_button').click();
	document.getElementById('liters_popup').innerHTML = content;
}

function orderConfirmedPopup(order) {
	var content = '\
    	<div data-role="popup" id="myPopupDialog">\
    		<div data-role="header">\
    			<h2>Order confirmed</h2>\
    		</div>\
    		<div data-role="main" class="ui-content">\
    			<p>Ordine confermato da '+ (order.fornitore).toUpperCase() +'. </br>Arrivo previsto: '+ order.consegna +' </br> Commenti: '+ order.commento +'</p>\
    			<a href="#" id="back-btn" class="ui-btn ui-btn-inline ui-icon-back ui-btn-icon-left" data-rel="back">Back</a>\
    	</div>';
    $('#bid_button').click();
	document.getElementById('liters_popup').innerHTML = content;
}

function createTimer(minutes) {
	document.getElementById('bid_button').style.pointerEvents = 'none';
	var min = minutes * 1000 * 60;
	// Set the date we're counting down to
	var countDownDate = new Date().getTime() + min;
	// Update the count down every 1 second
	var x = setInterval(function() {

	  // Get todays date and time
	  var now = new Date().getTime();

	  // Find the distance between now an the count down date
	  var distance = countDownDate - now;

	  // Time calculations for days, hours, minutes and seconds
	  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
	  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

	  // Display the result in the element with id="demo"
	  $("#bid_button").text("Remaining bid time: " + minutes + "m " + seconds + "s ");

	  // If the count down is finished, write some text 
	  if (distance <= 0) {
	  	clearInterval(x);
		$("#bid_button").text("SELECT SUPPLIER");
		console.log('expired');
		androidNotification();
		var expiredEvent = new CustomEvent('timeExp', {detail: 'expired'});
		window.dispatchEvent(expiredEvent);
	  }
	}, 1000);
}



function importJQuery() {
    var base = 'jquery/jquery.min.js',
        mobile = 'jquery/jquery.mobile-1.4.5.min.js';
  //add jquery file
    var head = document.getElementsByTagName("head")[0],
  	    script = document.createElement('script');
        script.src = base ;
    head.appendChild(script);
	//add jquery mobile file
    var scriptTwo = document.createElement('script');
        scriptTwo.src = mobile;
    head.appendChild(scriptTwo);
}

//##################### create stock chart ##########################

function stockColorPicker(total, data) {
	var color;
	if(data > (total*75)/100) {
		color = 'rgba(84, 239, 42, 0.50)';
	}
	else if (data > (total*25)/100) {
		color = 'rgba(255,255,0,0.50)';
	}
	else {
		color = 'rgba(255,0,0,0.50)';
	}
	return color;
}

var remaining = 3800, capacity = 4500;
new Chart(document.getElementById("stock-chart"), {
    type: 'pie',
    data: {
      labels: ["Capacity", "Remaining"],
      datasets: [{
        label: "Stock stats",
        backgroundColor: ["#D1D1D1", stockColorPicker(capacity, remaining)],
        data: [capacity,remaining]
      }]
    }
});

new Chart(document.getElementById("week-chart"), {
  type: 'line',
  data: {
    labels: ['Mon','Tue','Wen','Thu','Frid','Sat','Sun'],
    datasets: [{
        data: [1000,1140,1060,1060,1007,1101,1303],
        label: "Daily usage",
        borderColor: "#8cb3d9",
        fill: true
      }
    ]
  },
  options: {
    title: {
      display: false
    }
  }
});

new Chart(document.getElementById("month-chart"), {
  type: 'line',
  data: {
    labels: ['Week-1','Week-2','Week-3','Week-4'],
    datasets: [{
        data: [1000,1140,1060,1060],
        label: "Weekly usage",
        borderColor: "#8cb3d9",
        fill: true
      }
    ]
  },
  options: {
    title: {
      display: false
    }
  }
});

//###################### DB ########################################

function create_New_Order(supplier) {
	var selectedSupplier = getSupplier(supplierContainer, supplier.getAttribute('name'));
	console.log(selectedSupplier);
	$("#bid_button").text("Start bid");
	fetch('http://benza.chainment.com/orders/create', {
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			fornitore: selectedSupplier.name,
			cliente: user.name,
			litri: globalLitRequest
	})
	}).then(function(response) {
		$('.supplier').css('pointerEvents', 'auto');
		$('liters_popup').show();
		$('#global').click();
		if (response.ok) {
			console.log('create_new_order response ok');
			return response.json();
		}
		throw new Error("create_new_order response problem");
		}).then(function(pippo) {
			//if the response from server is ok create order and trigger timer
			//console.log(user.name);
			console.log(pippo);
			})
		return false;
}

function sendOrder(req_liters) {
	fetch('http://benza.chainment.com/orders/request', {
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			cliente: user.name,
			litri: req_liters
	})
	}).then(function(response) {
		if (response.ok) {
			console.log('response ok');
			return response.json();
		}
		throw new Error("response problem");
		}).then(function(pippo) {
			//if the response from server is ok create order and trigger timer
			//console.log(user.name);
			console.log(pippo);
			createTimer(10);
			})
		return false;
}

function changePriceTrend(fornitore, price, trend) {
	var upArrow = '▲', downArrow = '▼';
	$('#'+fornitore+'_price').text(price + ' €');
	$('#'+fornitore+'_trend').text(trend);
	if(trend >= 0) {
			if($('.'+fornitore+'_arrow').hasClass('green')) {
				$('.'+fornitore+'_arrow').removeClass('green');
				$('.'+fornitore+'_arrow').addClass('red');
				$('.'+fornitore+'_arrow').text(upArrow);
			}
		} else {
			if($('.'+fornitore+'_arrow').hasClass('red')) {
				$('.'+fornitore+'_arrow').removeClass('red');
				$('.'+fornitore+'_arrow').addClass('green');
				$('.'+fornitore+'_arrow').text(downArrow);
			}
		}
}

function createSupplierDB(supplier) {
	fetch('http://benza.chainment.com:2000/suppliers', { 
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			nome: supplier.name,
			logo: supplier.logo,
			prezzo: supplier.price,
			trend: supplier.trend
		})}).then(function(response) {
		if (response.ok) {
			console.log('response ok');
			return response.json();
		}
		throw new Error("response problem");
	}).then(function(supplierRet) {
		console.log(supplierRet);
		})
	return false;
}

function checkPendingRequests(utente) {
	fetch('http://benza.chainment.com/clients/check', { 
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			user: utente
		})}).then(function(response) {
		if (response.ok) {
			console.log('check pending orders response: ok');
			return response.json();
		}
		throw new Error("check pending orders response: problem");
	}).then(function(pendingReq) {
			if(pendingReq.info.data[0] != null) {
				globalLitRequest = pendingReq.info.litri[0];
				console.log("pending-order, date: " + pendingReq.info.data[0]);
				var currentData = new Date();
				var orderData = new Date(pendingReq.info.data[0]);
				orderData.setHours(orderData.getHours()-2); //correct GMT +2		
				var elapsedTime = (currentData.getTime() - orderData.getTime())/60000;
				if(elapsedTime < 10) {
					createTimer(10 - elapsedTime);
					console.log('Timer created');
				} else {
						$("#bid_button").text("SELECT SUPPLIER");
						var expiredEvent = new CustomEvent('timeExp', {detail: 'expired'});
						window.dispatchEvent(expiredEvent);
				}
			} else {
				console.log("no-pending-orders");
			}
		})
	return false;
}

function createContent(supplierContainer) {
	createSupplier(supplierContainer);
	createGeneralHistory(supplierContainer);
}


//###################################################################################################


infoSetupDB();
