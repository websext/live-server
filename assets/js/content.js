(function() {
	const actualInput = document.querySelector("#actualServer");
	const liveInput 	= document.querySelector("#liveServer");
	document.querySelector("#serveButton").addEventListener("click", function() {
		var liveUrl=false, actualUrl, actualError, liveError;

		try {
			actualUrl = new URL(actualInput.value);
			liveUrl 	= new URL(liveInput.value);
		} catch(e) {actualUrl	= false}

		actualError = document.querySelector(".field2 .error");
		liveError		= document.querySelector(".field1 .error");

		actualError.innerHTML=liveError.innerHTML="";

		var errors = {live: liveError, actual: actualError};
		liveInput.label		=	"live";
		actualInput.label	=	"actual";
		var thrower = [
			":placeholder server address is required.",
			"Invalid :placeholder server address Url"
		];

		var i, error, chamber = [liveInput, {value: liveUrl, label: "live"},
			actualInput, {value: actualUrl, label: "actual"}
		];

		for (i in chamber) {
			if (!chamber[i].value) {
				error=chamber[i].nodeType ? thrower[0] : thrower[1];
				errors[chamber[i].label].innerHTML=error.replace(":placeholder", chamber[i].label);
				return;
			}
		}

		this.innerHTML="Connecting...";
		serve(liveUrl, actualUrl, liveError, actualError, this);
	});

	chrome.storage.local.get(null, function(result) {
		if (window.localStorage.getItem("reload")) {
			document.querySelector("#switch").checked=true;
		}
		result.actualUrl && (actualInput.value=result.actualUrl);
		result.liveUrl && (liveInput.value=result.liveUrl);
	});

	function saveChromeTab(id, prevId) {
		chrome.storage.local.get([prevId], function() {
			chrome.storage.local.set({"tabId": id});
		});
	}

	document.querySelector("#switch").addEventListener("change", function() {
		this.checked ?
			window.localStorage.setItem("reload", 1) :
			window.localStorage.removeItem("reload");
	});

	function throwError(status, message) {
		var button = document.querySelector("#serveButton"),
			elem 		 = document.querySelector(".message");
		elem.classList.remove("fail");
		elem.classList.remove("done");
		elem.innerHTML=message;
		button.disabled=false;
		button.innerHTML="Continue";
		elem.classList.add(status||"fail");
		window.setTimeout(function() {elem.innerHTML=""}, 5000);
	}

	function serve(liveUrl, actualUrl, _liveError, _actualError, button) {
		var i=0, taburl, socket, socketUrl, prevId,
			reload=false;
		button.disabled=true;
		prevId="live-server" + 1 * Date.now();

		if (!("WebSocket" in window)) {
			window.localStorage.removeItem("reload");
			throwError(null, "Need to upgrade your brower. Browser not support websocket for live-server");
			return;
		}

		// http://127.0.0.1:5500/
		// Make url ws://127.0.0.1:55000/ Connecting... WebSocket
		socketUrl=(liveUrl.origin+liveUrl.pathname+"/ws");
		socketUrl=socketUrl.replace("http", "ws");
		socket=new WebSocket(socketUrl); // connecting websocket.

		socket.addEventListener("error", function() {
			document.querySelector("#switch").checked=false;
			window.localStorage.removeItem("reload");
			throwError(null, "Failed Live server is not enabled.");
		});

		socket.addEventListener("message", function() {
			chrome.tabs.query({}, function(tabs) {
				for(; i < tabs.length; i++) {
					taburl=new URL(tabs[i].url);
					if ((taburl.origin + taburl.pathname) === (actualUrl.origin + actualUrl.pathname)) {
						!window.localStorage.getItem("reload") && window.localStorage.setItem("reload", 1);
						saveChromeTab(tabs[i].id, prevId);
						reload && chrome.tabs.reload(tabs[i].id);
						reload=true;
						break;
					}
				}
			});
		});

		socket.addEventListener("open", function() {
			if (liveUrl.origin!==actualUrl.origin) {
				chrome.storage.local.set({liveUrl: liveUrl.origin + liveUrl.pathname});
				document.querySelector("#switch").checked=true;
				button.disabled=false;
				button.innerHTML="Continue";
				chrome.storage.local.set({actualUrl: actualUrl.origin + actualUrl.pathname});
				chrome.storage.local.set({"socketUrl": socketUrl});
				window.setTimeout(function() {
					window.close();
				});
			} else {
				window.localStorage.removeItem("reload");
				throwError(null, "Live server is already running on " + liveUrl.origin + " address.");
				return;
			}
		});
	}
})();