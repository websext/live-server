(function() {
	chrome.storage.local.get(null, function(result) {
		if (result.socketUrl && result.tabId) {
			var socket;
			socket=new WebSocket(result.socketUrl);
			socket.addEventListener("message", function() {
				chrome.tabs.reload(result.tabId);
			});
		}
	});
})();