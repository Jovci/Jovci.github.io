function displaySavedData() {
    chrome.storage.local.get({ Usersaves: [] }, function (result) {
        const Usersaves = result.Usersaves;
        const tbody = document.getElementById("dataRows");

        // Clear the existing table rows
        tbody.innerHTML = "";

        if (Usersaves.length === 0) {
            // Reset the badge count when there are no saved items
            resetBadge();
        }

        // Loop through the saved data and create table rows
        Usersaves.forEach((save, index) => {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            const priceCell = document.createElement("td");
            const stockCell = document.createElement("td");
            const linkCell = document.createElement("td");
            const deleteCell = document.createElement("td");

            nameCell.textContent = save.name;
            priceCell.textContent = "$" + save.salePrice;
            priceCell.style.color = save.priceColor || 'black'; // Use the priceColor property to set the color

            // Only display the original price if it's different from the current price
            if (save.salePrice !== save.originalPrice) {
                // Create a new element for the original price and append it to the priceCell
                const originalPriceElement = document.createElement("div");
                originalPriceElement.textContent = "Original: $" + (save.originalPrice || 'N/A');
                originalPriceElement.style.marginLeft = '10px'; // Add some indentation
                originalPriceElement.style.color = 'black'; // Set the color to black
                priceCell.appendChild(originalPriceElement);
            }

            stockCell.textContent = save.orderable;

            // Create an anchor element for the link and append it to the linkCell
            const linkElement = document.createElement("a");
            linkElement.href = save.link;
            linkElement.textContent = "Link";
            linkElement.target = "_blank"; // Open the link in a new tab
            linkCell.appendChild(linkElement);

            const FavoriteButton = document.createElement("button");
            FavoriteButton.textContent = "Favorite";
            FavoriteButton.className = "favorite-button";
            FavoriteButton.addEventListener("click", () => {
                if (index >= 0 && index < Usersaves.length) {
                    const save = Usersaves[index];
                    Usersaves.splice(index, 1);
                    Usersaves.unshift(save);
                    chrome.storage.local.set({ Usersaves: Usersaves }, function () {
                        console.log("Item deleted. Updated data:", Usersaves);
                        displaySavedData();
                    });
                } else {
                    console.error("Invalid index:", index);
                }
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-button";
            deleteButton.addEventListener("click", () => {
                Usersaves.splice(index, 1);
                chrome.storage.local.set({ Usersaves: Usersaves }, function () {
                    console.log("Item deleted. Updated data:", Usersaves);
                    displaySavedData();
                });
            });
            deleteCell.appendChild(FavoriteButton);
            deleteCell.appendChild(deleteButton);

            row.appendChild(nameCell);
            row.appendChild(priceCell);
            row.appendChild(stockCell);
            row.appendChild(linkCell);
            row.appendChild(deleteCell);

            tbody.appendChild(row);
        });
    });
}

// Function to increment the badge count
function incrementBadge() {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'incrementBadge' });
    } else {
        console.error("chrome.runtime.sendMessage is not available.");
    }
}

// Function to reset the badge count
function resetBadge() {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'resetBadge' });
    } else {
        console.error("chrome.runtime.sendMessage is not available.");
    }
}

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
document.addEventListener('DOMContentLoaded', function () {

    // Initialize the badge count to 0
    resetBadge();

    const getURLButton = document.getElementById("getURLButton");

    getURLButton.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            const url = activeTab.url;
    
            const skuID = getSKUFromURL(url);
    
            if (skuID) {
                const apiUrl = `https://api.bestbuy.com/v1/products/${skuID}.json?show=sku,name,orderable,salePrice&apiKey=UKLKI458vMr049KZq1DYNTCI`;
    
                fetch(apiUrl)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("Error in response");
                        }
                        return response.json();
                    })
                    .then((data) => {
                        chrome.storage.local.get({ Usersaves: [] }, function (result) {
                            const Usersaves = result.Usersaves;
                            const savedItem = {
                                name: data.name,
                                salePrice: data.salePrice,
                                originalPrice: data.salePrice, // Save the original price
                                orderable: data.orderable,
                                link: url,
                            };
                            Usersaves.push(savedItem);
                            chrome.storage.local.set({ Usersaves: Usersaves }, function () {
                                console.log("Data saved to chrome.storage.local:", Usersaves);
                                displaySavedData();
                            });
                        });
                    })
                    .catch((error) => {
                        console.error("Error fetching data from the API:", error);
                    });
    
                // Increment the badge count and make it visible
                incrementBadge();
            } else {
                displaySavedData();
            }
        });
    });
    displaySavedData();
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'priceUpdated') {
        // Update the UI with the new data
        displaySavedData();
    }
});
displaySavedData();