/**
 * @classdesc Represents a User.
 * @constructor
 * @param {string} name - The name of the user.
 */

class User {
	constructor(name) {
		this.name = name;
	}
	/**
	* Returns the name of current user
	* @return {string}
	*/
	getName() {
		return this.name;
	}
}

//GLOBAL VARIABLES

var user = new User("q8");
var clientToChange;
var clientNewPrice = 0.000;
var clientNewTrend = 0.000;
var clientRequest = 0;
var clientContainer = new Array();
var orderContainer = new Array();
var clientsChannelContainer = [];

//open connection to pusher
var pusher = new Pusher('b76c8b879914f2448970', {
	cluster: 'eu'
});

/**
 * @classdesc Represents an Order.
 * @constructor
 * @param {string} supplier - The name of the supplier.
 * @param {string} client - The name of the client.
 * @param {string} order - The date when the order was confirmed
 * @param {string} cost - Order cost for a single liter
 * @param {string} amount - Order request liters
 * @param {string} total - Order's total cost
 */

class Order {
	constructor(supplier, client, date, costPu, lit, total) {
		this.supplier = supplier;
		this.client = client;
		this.date = date;
		this.costPu = costPu;
		this.lit = lit;
		this.total = this.lit * this.costPu;
	}
	/**
	* Access an order instance using an index
	* @param {number} index - 
	* @return {string}
	*/
	getOrderInfo(index) {
		var info;
		switch(index) {
			case 0:
				info = this.supplier;
			case 1:
				info = this.client;
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

/**
 * @classdesc Represents a Client.
 * @constructor
 * @param {string} name - The name of the clien.
 * @param {string} logo - Client's logo path.
 * @param {Number} price - Actual showed price for the client instance
 * @param {Number} trend - Actual showed trend for the client instance
 * @param {Number} request - Actual liters request by the client
 */

class Client {
	constructor(name, logo, price, trend, request) {
		this.name = name;
		this.logo = logo;
		this.price = price;
		this.trend = trend;
		this.request = 0;
		this.history = [];
		this.orders = this.history.length;
		this.priceChangeable = false;
	}
	/**
 	* Set the name of the Client.
 	* @param {string} name - The new client's name.
 	*/
	setName(newName) {
			this.name = newName;
	}
	/**
 	* Set the logo of the Client.
 	* @param {string} logo - New path to client's logo.
 	*/
	changeLogo(url) {
		this.logo = url;
	}
	/**
 	* Set the showed price of the Client.
 	* @param {Number} price - The new showed price of the Client.
 	*/
	setPrice(newPrice) {
		this.price = newPrice;
	}
	/**
 	* Set the showed trend of the Client.
 	* @param {Number} trend - The new showed trend of the Client.
 	*/
	setTrend (newTrend) {
		this.trend = newTrend;
	}
	/**
 	* Increment client's order.
 	*/
	incrementOrders () {
		this.orders++;
	}
	/**
 	* Adds a new order to the Client.
 	* @param {string} order - The new client's order.
 	*/
	addOrder (newOrder) {
		this.incrementOrders();
		this.history.push(newOrder);
	}
	/**
 	* Set client's price and trend unchangeable
 	* @param {boolean} flag - true: block price/trend, false: set price/trend changeable.
 	*/
	blockPrice(flag) {
		this.priceChangeable = !flag;
	}
	/**
 	* Check if client's price/trend is changeable.
 	* @return {boolean} flag - true: price/trend are blocked, false: price/trend are changeable.
 	*/
	isChangeable() {
		return this.priceChangeable;
	}
}

function hideLoader() {
	$('.hide').removeClass('hide');
	$('#cover').delay(1000).fadeOut("slow");
}

function getClient(clientContainer, clientName) {
	for(var i = 0; i < clientContainer.length; i++) {
		if(clientContainer[i].name == clientName) {
			return clientContainer[i];
		}
	}
	console.log('getClient(): client not found!');
	return null;
}

function createClientContainer(clientContainer) {
	"use strict";
	var	main = document.getElementById('main_page'),
		collapsibleset,
		i;
	for (i = 0; i < clientContainer.length; i++) {
		collapsibleset = document.createElement('div');
		collapsibleset.setAttribute('data-role', 'collapsibleset');
		collapsibleset.setAttribute('class', 'supplier_container');
		collapsibleset.setAttribute('id', clientContainer[i].name);
		main.appendChild(collapsibleset);
	}
}

function addOrderToHistory(order, price) {
	var tbody = document.getElementById(order.cliente + '-table'),
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
	tdPrice.textContent = price;
	tr.appendChild(tdPrice);
	var tdLiters = document.createElement('td');
	b.textContent = 'Lit.';
	tdLiters.appendChild(b);
	tdLiters.textContent = order.litri;
	tr.appendChild(tdLiters);
	var tdTotal = document.createElement('td');
	b.textContent = 'Total';
	tdTotal.appendChild(b);
	tdTotal.textContent = price * order.litri;
	
	tr.appendChild(tdTotal);
	//add new order to client history
	tbody.appendChild(tr);
	var incOrders = $('#'+order.cliente+'-orders').text();
	incOrders = parseInt(incOrders) + 1;
	$('#'+order.cliente+'-orders').text(incOrders.toString());
}

function createClientHistory(client) {
	var table = document.getElementById(client.name + '_history'),
		thead = document.createElement('thead'),
		trHead = document.createElement('tr'),
		tbody = document.createElement('tbody'),
		textArray = ['Date', 'Cost', 'Lit.', 'Total'],
		i;
	tbody.setAttribute('id', client.name+'-table');
	/*create table head*/
	for (i = 0; i < textArray.length; i++) {
		var th = document.createElement('th');
	th.textContent = textArray[i];
		trHead.appendChild(th);
	}
	thead.appendChild(trHead);
	/*create table body*/
	for (i = client.orders - 1; i >= 0; i--) {
		var tr = document.createElement('tr'),
			j;
		tr.setAttribute('class', 'ui-shadow');
		for (j = 2; j <= textArray.length + 1; j++) {
			var td = document.createElement('td');
			if (typeof client.history[i].getOrderInfo(j) === typeof 0) {
				td.textContent = client.history[i].getOrderInfo(j).toString();
			} else {
				td.textContent = client.history[i].getOrderInfo(j);
			}
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}
	table.appendChild(thead);
	table.appendChild(tbody);
}

//################ ANDROID FUNCTIONS #######################3

function androidNotification() {
	Android.playNotification();
}

function createClient(clientContainer) {
	"use strict";
	createClientContainer(clientContainer);
	var content, signSimbol, arrowColorClass, i, trendABS, arrow;
	for (i = 0; i < clientContainer.length; i++) {
		if (clientContainer[i].trend > 0) {
			signSimbol = '+';
			arrowColorClass = 'green';
			trendABS = clientContainer[i].trend;
			arrow = '&#9650;';
		} else {
			signSimbol = '-';
			arrowColorClass = 'red';
			trendABS = Math.abs(clientContainer[i].trend);
			arrow = '&#9660;';
		}
		content = '\
		<div data-role="collapsible" data-collapsed-icon="false" data-expanded-icon="false" class="client" id="' + clientContainer[i].name + '">\
			<h3 name="' + clientContainer[i].name + '">\
				<div class="ui-grid-b" name="' + clientContainer[i].name + '">\
					<div class="ui-block-a client_logo_container" name="' + clientContainer[i].name + '">\
						<img src="' + clientContainer[i].logo + '" alt="' + clientContainer[i].name + '"class="client_logo" name="' + clientContainer[i].name + '">\
					</div>\
					<div class="ui-block-b" name="' + clientContainer[i].name + '">\
						<div class="ui-grid-b price_container" name="' + clientContainer[i].name + '">\
							<div class="ui-block-a price" role="' + clientContainer[i].name + '">\
								<p id="' + clientContainer[i].name + '_price">' + clientContainer[i].price + ' &euro;</p>\
							</div>\
							<div class="ui-grid-b trend_container" name="' + clientContainer[i].name + '">\
								<div class="ui-block-a trend" name="' + clientContainer[i].name + '">\
									<p id="' + clientContainer[i].name + '_trend"> ' + clientContainer[i].trend + '</p>\
								</div>\
								<div class="ui-block-b trend_arrow ' + arrowColorClass + '" name="' + clientContainer[i].name + '">\
									<p class="'+ clientContainer[i].name  +'-arrow" name="' + clientContainer[i].name + '">' + arrow + '</p>\
								</div>\
							</div>\
						</div>\
					</div>\
					<div class="ui-block-c client_orders" name="' + clientContainer[i].name + '">\
						<p name="' + clientContainer[i].name + '">Total orders</p>\
						<p name="' + clientContainer[i].name + '" id="'+ clientContainer[i].name +'-orders">' + clientContainer[i].orders + '</p>\
					</div>\
				</div>\
			</h3>\
			<span class="client_history">\
				<table data-role="table" class="ui-responsive client_history columntoggle" id="' + clientContainer[i].name + '_history"></table>\
			</span>\
	</div>';
		document.getElementById(clientContainer[i].name).innerHTML = content;
		createClientHistory(clientContainer[i]);
	}
}

function createGeneralHistory(clientContainer) {
	var thead = document.createElement('thead'),
		trHead = document.createElement('tr'),
		tbody = document.createElement('tbody'),
		textArray = ['Client', 'Date', 'Cost', 'Lit.', 'Total'],
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
	for (i = 0; i < clientContainer.length; i++) {
		for (var j = 0; j < clientContainer[i].orders; j++) {
			var tr = document.createElement('tr');
			var tdSup = document.createElement('td');
			tdSup.textContent = clientContainer[i].history[j].client;
			var tdDat = document.createElement('td');
			tdDat.textContent = clientContainer[i].history[j].date;
			var tdCost = document.createElement('td');
			tdCost.textContent = clientContainer[i].history[j].costPu;
			var tdLit = document.createElement('td');
			tdLit.textContent = clientContainer[i].history[j].lit;
			var tdTot = document.createElement('td');
			tdTot.textContent = clientContainer[i].history[j].total;
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

function confirmLiters() {
    var content = '<div data-role="popup" id="myPopupDialog"><div data-role="header"><h2>Confirmation required</h2></div><div data-role="main" class="ui-content"><p>Do you really want to send a ' + document.getElementById('input_liters').value + ' liters request?</p><a href="#" class="confirm-order ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-check ui-btn-icon-left" data-rel="back" onclick="createTimer(10)">Accept</a><a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b ui-icon-delete ui-btn-icon-left reject-order" data-rel="back">Delete</a></div>';
	document.getElementById('liters_popup').innerHTML = content;
}

function importJQueryforWeb() {
   $.getScript("jquery/jquery.min.js", function() {
		$.getScript("jquery/jquery.mobile-1.4.5.min.js", function() {
				console.log("jq mobile loaded");
		});
	});
}

function createTimer(minutes, client) {
	var min = minutes * 1000 * 60
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
		var clientTimer = $('#'+client+'-timer');
		if((seconds % 2) === 0) {
			$('#'+client+' > .ui-collapsible-heading-collapsed').css('border-width', '3px');
			$('#'+client+' > .ui-collapsible-heading-collapsed').css('border-style', 'solid');
			$('#'+client+' > .ui-collapsible-heading-collapsed').css('border-color', 'rgba(84, 239, 42, .8)');
	  	}
		else {
	  		$('#'+client+' > .ui-collapsible-heading-collapsed').css('border', 'none');
		}
	  if(minutes > 5) {
		  if(!clientTimer.hasClass('green-bk')) {
		  	clientTimer.addClass('green-bk');		  
		  }
	  } else if(minutes > 1) {
		  if(clientTimer.hasClass('green-bk')) {
		  	clientTimer.removeClass('green-bk');
		  }
		  clientTimer.addClass('yellow-bk');
	  } else {
		  if(clientTimer.hasClass('yellow-bk')) {
		  	clientTimer.removeClass('yellow-bk');
		  }
		  clientTimer.addClass('red-bk');
	  }

	  	// Display the result in the element with id="demo"
	  	clientTimer.text("Remaining " + minutes + "m " + seconds + "s ");
	  // If the count down is finished, write some text 
	  if (distance < 0) {
		clearInterval(x);
		//$('#'+client+'-timer').text("PENDING");
		clientTimer.removeClass('red-bk');
		$('#'+client+' > .ui-collapsible-heading-collapsed').css('border', 'none');
		clientTimer.text('');
		$('#req-quantity').val("");
		$('#price-quantity').val("");
		$('#trend-quantity').val("");
		getClient(clientContainer, client).blockPrice(true);
		console.log("price not changeable");
		return true;
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

function infoSetupDB() {
	fetch('http://benza.chainment.com/orders', {method : 'GET', headers: {'Access-Control-Allow-Origin':''}}).then(
		function(response) {
			if (response.ok) {
				console.log('Server response success for GET orders, code: ' + response.status);
				return response.json();
			}
			throw new Error("'Server response error for GET orders, code: ' + console.log(response.status)");
		}).then(
			function(orders) {
				for(var i = 0; i < orders.length; i++) {
					orderContainer.push(new Order(orders[i][1],
										  		  orders[i][2],
										  		  orders[i][3],
										  	      orders[i][4],
												  orders[i][5],
												  orders[i][6]));
				}
				return orderContainer;
			}).then(function getClientDB(orderContainer) {
					fetch('http://benza.chainment.com/clients', {method : 'GET', headers: {'Access-Control-Allow-Origin':''} }).then(function(response) {
						if(response.ok) {
							console.log('Server response success for GET clients, code: ' + response.status);
							return response.json();
						}
						throw Error('Server response error for GET clients, code: ' + console.log(response.status));
					}
					//passes the response to next function
					).then(function(clients) {
						for(var i = 0; i < clients.length; i++) {
							clientContainer.push(new Client(clients[i][0],
													 clients[i][1],
													 clients[i][2],
													 clients[i][3]));
							for(var j = 0; j < orderContainer.length; j++) {
								if(orderContainer[j].client == clientContainer[i].name) {
									clientContainer[i].addOrder(orderContainer[j]);
								}
							}
							//create channels for every client
							var channel = pusher.subscribe(clientContainer[i].name+'-channel');
							clientsChannelContainer.push({key : clientContainer[i].name, value: channel})
							//bind channels with client's requests
							clientsChannelContainer[i].value.bind('order-request', function(data) {
								console.log('client: ' + data.cliente + ', request: ' + data.litri);
								//write liters amount request
								var stop = false;
								for(var i = 0; i < clientContainer.length && !stop; i++) {
									if(clientContainer[i].name == data.cliente) {
										clientContainer[i].request = data.litri;
										clientContainer[i].blockPrice(false);
										stop = true;
									}										
								}
								if(stop) {
									createTimer(10, data.cliente);
									$('#req-quantity').val(data.litri);
									androidNotification();
								}
							})
							//the supplier receives a new order
							clientsChannelContainer[i].value.bind('create-order', function(data) {
								var targetClient = getClient(clientContainer, data.cliente);
								if(data.fornitore == user.name) {
									console.log('order received from: ' + data.cliente + ', liters: ');
									androidNotification();
									$('#confirm-hide-btn').click();
									$('#confirmation-text').text('Cliente: ' + data.cliente + ', Litri: ' + data.litri + ', Prezzo: ' + targetClient.price);
									$('#confirmation-btn').on('click', function() {
										var comments = $('#name-b').val();
										console.log(comments);
										var delivery = $('#select-choice-a').find(":selected").text();
										sendConfirmation(data, delivery, comments);
										addOrderToHistory(data, targetClient.price);
									});
									$('#reject-btn').on('click', function() {
										//send: order rejected to client
										console.log('order-rejected');
										sendConfirmation(data, null, null);
									});
								}
							})
						}
						return clientContainer;
					}).then(function() {
							createContent(clientContainer);
							//add jquery file
                            importJQuery();
							swipeHandler();
							hideLoader();
							for(var i = 0; i < clientContainer.length; i++) {
								checkPendingRequests(clientContainer[i].name);
							}
                       })
					})
}

function clientPriceEditor() {
	var content = 0;
}

function setPriceEditor(client) {
	var selectedClient = getClient(clientContainer, client);
	checkPendingRequests(client);
	if(selectedClient.isChangeable()) {
		$('.trend-quantity-up-plus').css('pointerEvents', 'auto');
		$('.trend-quantity-down-minus').css('pointerEvents', 'auto');
		$('.price-quantity-up-plus').css('pointerEvents', 'auto');
		$('.price-quantity-down-minus').css('pointerEvents', 'auto');
		var price = 0.000, trend = 0.000, logoUrl = '', request = 0, stop = false;
		for(var i = 0; i < clientContainer.length && !stop; i++) {
			if(clientContainer[i].name == client) {
				logoUrl = clientContainer[i].logo;
				price = $('#'+client+'_price').text();
				trend = $('#'+client+'_trend').text();
				clientNewPrice = parseFloat(clientContainer[i].price).toFixed(3);
				clientNewTrend = parseFloat(clientContainer[i].trend).toFixed(3);
				request = parseInt(clientContainer[i].request);
				stop = true;
			}
		}
		$('img#client-panel-img').attr('src', logoUrl);
		$('#price-quantity').val(price);
		$('#trend-quantity').val(trend);
		$('.client-timer').attr('id', client+'-timer');
		console.log(client+'-timer');
		$('#req-quantity').val(request);
	} else {
		$('.trend-quantity-up-plus').css('pointerEvents', 'none');
		$('.trend-quantity-down-minus').css('pointerEvents', 'none');
		$('.price-quantity-up-plus').css('pointerEvents', 'none');
		$('.price-quantity-down-minus').css('pointerEvents', 'none');
		$('img#client-panel-img').attr('src', selectedClient.logo);
		$('#req-quantity').val("");
		$('#price-quantity').val("");
		$('#trend-quantity').val("");
		console.log("price not changeable");
	}
}

function sendPriceInfo(client, price, trend) {
	fetch('http://benza.chainment.com/clients/price', {
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			fornitore: user.name,
			cliente: client,
			prezzo: price,
			trend: trend
	})
	}).then(function(response) {
		if (response.ok) {
			console.log('response ok');
			return response.json();
		}
		throw new Error("response problem");
		}).then(function(data) {
			//if the response from server is ok create order and trigger timer
			//console.log(user.name);
			console.log(data);
			})
		return false;
}

function sendConfirmation(order, delivery, comments) {
	fetch('http://benza.chainment.com/orders/confirm', { 
			method : 'POST',
			headers: {'Access-Control-Allow-Origin':''},
			contentType: 'application/json',
			body: JSON.stringify({
				fornitore: user.name,
				cliente: order.cliente,
				litri: order.litri,
				consegna: delivery,
				commento: comments
			})
		}).then(function(response) {
				if (response.ok) {
					console.log('response ok');
					return response.json();
				}
				throw new Error("response problem");
			}).then(function(clientRet) {
				console.log(clientRet);
				})
	return false;
}

function swipeHandler() {      
  //Enable swiping...
  $('.client').swipe( {
  //Generic swipe handler for all directions
	swipeLeft:function(event, direction, distance, duration, fingerCount, fingerData) {
        if(direction == "left") {
            clientToChange = (event.target).getAttribute('name');
            if(clientToChange != null) {
                console.log(clientToChange);
                $( "#right-panel" ).panel( "open" );
                $('#settings-popup').removeClass('hide');
				
                setPriceEditor(clientToChange);
            }
        }
	},
	//Default is 75px, set to 0 for demo so any distance triggers swipe
    threshold:75

  });
}

function checkPendingRequests(cliente) {
	fetch('http://benza.chainment.com/clients/check', { 
		method : 'POST',
		headers: {'Access-Control-Allow-Origin':''},
		contentType: 'application/json',
		body: JSON.stringify({
			user: cliente
		})}).then(function(response) {
		if (response.ok) {
			console.log('check pending orders response: ok');
			return response.json();
		}
		throw new Error("check pending orders response: problem");
	}).then(function(pendingReq) {
			if(pendingReq.info.data[0] != null) {
				var pendingClient = getClient(clientContainer, cliente);
				pendingClient.request = pendingReq.info.litri[0];
				//globalLitRequest = pendingReq.info.litri[0];
				console.log("pending-order, date: " + pendingReq.info.data[0]);
				var currentData = new Date();
				var orderData = new Date(pendingReq.info.data[0]);
				orderData.setHours(orderData.getHours()-2); //correct GMT +2		
				var elapsedTime = (currentData.getTime() - orderData.getTime())/60000;
				if(elapsedTime < 10) {
					console.log('Pending order from: ' + cliente);
					createTimer(10 - elapsedTime, cliente);
					pendingClient.blockPrice(false);
					return true;
				}
			} else {
				console.log("no-pending-orders");
				getClient(clientContainer, cliente).blockPrice(true);
				return false;
		}
	})
	return false;
}

function createClientDB(client) {
	fetch('http://benza.chainment.com/client', { 
			method : 'POST',
			headers: {'Access-Control-Allow-Origin':''},
			contentType: 'application/json',
			body: JSON.stringify({
				nome: client.name,
				logo: client.logo,
				prezzo: client.price,
				trend: client.trend
			})
			}).then(function(response) {
				if (response.ok) {
					console.log('response ok');
					return response.json();
				}
				throw new Error("response problem");
			}).then(function(clientRet) {
				console.log(clientRet);
											})
	return false;
}

function createContent(clientContainer) {
	createClient(clientContainer);
	createGeneralHistory(clientContainer);
}

function hideSettings() {
	//$('#settings-popup').hide();
}

function changeClientPriceTrend(){
	var oldPrice, oldTrend, upArrow = '▲', downArrow = '▼', i;
	var stop = false;
	for(i = 0; i < clientContainer.length && !stop; i++) {
		if(clientContainer[i].name == clientToChange){
			oldPrice = clientContainer[i].price;
			oldTrend = clientContainer[i].trend;
			stop = true;
		}
	}
	if(clientToChange != null && oldPrice != clientNewPrice) {
		clientContainer[i-1].setPrice = clientNewPrice;
		console.log(clientContainer[i-1]);
		$('#'+clientToChange+'_price').text(clientNewPrice.toFixed(3) + ' \u20ac');
	}
	if(clientNewTrend != oldTrend && clientToChange != null) {
		clientContainer[i-1].setTrend = clientNewTrend;
		if(clientNewTrend >= 0) {
			if($('#' + clientToChange + '.trend_arrow').hasClass('red')) {
				$('#' + clientToChange + '.trend_arrow').removeClass('red');
				$('#' + clientToChange + '.trend_arrow').addClass('green');
				$('.' + clientToChange + '-arrow').text(upArrow);
			}
		} else {
			if($('#' + clientToChange + '.trend_arrow').hasClass('green')) {
				$('#' + clientToChange + '.trend_arrow').removeClass('green');
				$('#' + clientToChange + '.trend_arrow').addClass('red');
				$('.' + clientToChange + '-arrow').text(downArrow);
			}
		}
		$('#'+clientToChange+'_trend').text(clientNewTrend.toFixed(3));
	}
	sendPriceInfo(clientToChange, clientNewPrice, clientNewTrend);
}

function priceTrendInc() {
	//PRICE INCREMENT
	var priceQuantity=0;
   	$('.price-quantity-up-plus').click(function(e){
        // Stop acting like a button
        e.preventDefault();
        // Get the field name
        var priceQuantity = parseFloat($('#price-quantity').val());    
        // If is not undefined
        $('#price-quantity').val((priceQuantity + 0.001).toFixed(3));
		clientNewPrice = priceQuantity + 0.001;
        // Increment
    });
    $('.price-quantity-down-minus').click(function(e) {
        // Stop acting like a button
        e.preventDefault();
        // Get the field name
        var priceQuantity = parseFloat($('#price-quantity').val()); 
        // If is not undefined
        	// Increment
            if (priceQuantity > 0) {
            	$('#price-quantity').val((priceQuantity - 0.001).toFixed(3));
				clientNewPrice = priceQuantity - 0.001;
            }
    });
	//TREND INCREMENT
	var trendQuantitiy = 0;
   	$('.trend-quantity-up-plus').click(function(e){
        // Stop acting like a button
        e.preventDefault();
        // Get the field name
        var trendQuantitiy = parseFloat($('#trend-quantity').val());    
        // If is not undefined
        $('#trend-quantity').val((trendQuantitiy + 0.001).toFixed(3));
		clientNewTrend = trendQuantitiy + 0.001;
        // Increment
    });
    $('.trend-quantity-down-minus').click(function(e) {
        // Stop acting like a button
        e.preventDefault();
        // Get the field name
        var trendQuantitiy = parseFloat($('#trend-quantity').val()); 
        // If is not undefined
        	// Increment
            $('#trend-quantity').val((trendQuantitiy - 0.001).toFixed(3));
		clientNewTrend = trendQuantitiy - 0.001;
    });
}

//###################################################################################################


infoSetupDB();
priceTrendInc();
