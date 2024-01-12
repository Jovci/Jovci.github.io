let badgeCount = 0;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'incrementBadge') {
        badgeCount++;
        chrome.action.setBadgeText({ text: badgeCount.toString() });
    } else if (request.action === 'resetBadge') {
        badgeCount = 0;
        chrome.action.setBadgeText({ text: '' });
    }
});

// Make sure to handle the install event for the service worker
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage();
    }
});

function getSKUFromURL(url) {
    if (typeof url !== 'string') {
        return null;
    }

    const match = url.match(/\/(\d+)\.p\?skuId=(\d+)/);
    if (match && match[2]) {
        return match[2];
    }
    return null;
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('checkPriceUpdates', { periodInMinutes: 5/60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkPriceUpdates') {
        checkPriceUpdates();
    }
});

function checkPriceUpdates() {
    chrome.storage.local.get({ Usersaves: [] }, function (result) {
        let Usersaves = result.Usersaves;

        Usersaves.forEach((save, index) => {
            const skuID = getSKUFromURL(save.link);

            if (skuID) {
                const apiUrl = `https://api.bestbuy.com/v1/products/${skuID}.json?show=sku,name,orderable,salePrice&apiKey=UKLKI458vMr049KZq1DYNTCI`;
            
                fetch(apiUrl)
                    .then((data) => {
                        // Compare the new price with the original price and set the color
                        if (save.salePrice > oldPrice) {
                            save.priceColor = 'red';
                        } else if (save.salePrice < oldPrice) {
                            save.priceColor = 'green';
                        }

                        Usersaves[index] = save;
                        chrome.storage.local.set({ Usersaves: Usersaves }, function () {
                            console.log("Price updated. Updated data:", Usersaves);
                            // Send a message to the popup script
                            chrome.runtime.sendMessage({ action: 'priceUpdated', Usersaves: Usersaves });
                        });
                    })
            }
        });
    });
}