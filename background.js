// background.js - Service worker for FetchMark

// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(details => {
    console.log('FetchMark installed or updated:', details.reason);
    // Potential future use: Pre-fetch/cache bookmarks on install/update
    // import('./bookmarks.js').then(({ getBookmarks }) => {
    //   getBookmarks(true); // Force refresh on update/install
    // }).catch(e => console.error("Failed to pre-cache bookmarks", e));
  });
  
  // Listener for messages (e.g., from popup or content scripts, if added later)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message, 'from sender:', sender);
  
    // Example: Handle a potential future request from the popup
    if (message.action === 'performBackgroundTask') {
      console.log('Performing background task...');
      // Simulate async work
      setTimeout(() => {
        sendResponse({ success: true, result: 'Background task completed' });
      }, 1000);
      return true; // Indicates that the response will be sent asynchronously
    }
  
    // Add more message handlers as needed
  });
  
  // Optional: Keep the service worker alive for a short period if needed for ongoing tasks
  // This is generally discouraged unless absolutely necessary.
  // let lifeline;
  //
  // keepAlive();
  //
  // chrome.runtime.onConnect.addListener(port => {
  //   if (port.name === 'keepAlive') {
  //     lifeline = port;
  //     setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
  //     port.onDisconnect.addListener(keepAliveForced);
  //   }
  // });
  //
  // function keepAliveForced() {
  //   lifeline?.disconnect();
  //   lifeline = null;
  //   keepAlive();
  // }
  //
  // async function keepAlive() {
  //   if (lifeline) return;
  //   for (const tab of await chrome.tabs.query({ url: '*://*/*' })) {
  //     try {
  //       await chrome.scripting.executeScript({
  //         target: { tabId: tab.id },
  //         function: () => console.log('keepAlive'),
  //       });
  //       chrome.runtime.connect({ name: 'keepAlive' });
  //       return;
  //     } catch (e) {}
  //   }
  // }
  
  console.log('FetchMark Background Service Worker Started.');