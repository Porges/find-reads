async function go() {
    const metadatas = document.querySelectorAll("head > script[type='application/ld+json']");
    for (const metadata of metadatas) {
        const data = JSON.parse(metadata.textContent);
        if (data['@context'] !== 'https://schema.org' || data['@type'] !== 'Book') {
            continue;
        }

        const isbn = data['isbn'];
        const title = data['name'];
        const author = data['author'][0]['name'];
        console.debug(`Found book: ISBN=${isbn}, Title=${title}, Author=${author}`);

        const secondButton = document.querySelector(".BookActions > .BookActions__button")?.nextElementSibling;
        if (!secondButton) {
            console.error("unable to find insertion location for FindReads button!");
            return;
        } 

        let query = `query=${encodeURIComponent(cleanTitle(title))}&creator=${encodeURIComponent(cleanAuthor(author))}&mediaType=ebook&sortBy=relevance`;

        chrome.storage.sync.get({
            uris: []
        }, items => {
            if (items.uris.length === 0) {
                const button = makeButton("Configure FindReads!");
                button.onclick = () => chrome.runtime.sendMessage({'action': 'openOptionsPage'});
                secondButton.insertAdjacentElement('beforebegin', button);
                return;
            }
            
            for (const library of items.uris) {
                const button = makeButton(`Loading ${library}…`);
                secondButton.insertAdjacentElement('beforebegin', button);
                searchLibrary(library, query, button);
            }
        });

        return;
    }
}

function cleanAuthor(rawAuthor) {
    // remove any initials, collapse spaces
    return rawAuthor.replace(/\b[A-Z]\./g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function cleanTitle(rawTitle) {
    // remove any subtitle or series name, collapse spaces
    return rawTitle.replace(/\(.*?\)/g, ' ').split(":")[0].replace(/\s{2,}/g, ' ').trim();
}

async function searchLibrary(library, query, button) {
    const searchUrl = `https://${library}/search/title?${query}`;
    let body;
    try {
        const response = await fetch(searchUrl);
        body = await response.text();
    } catch (e) {
        button.replaceWith(makeButton(`Error searching ${library}: ${e}`));
        return;
    }

    const libraryRegex = /window\.OverDrive\.libraryName = "(.*)"/;
    const libraryName = libraryRegex.exec(body)[1];

    const mediaItemsRegex = /window\.OverDrive\.mediaItems = (\{.+\})/;
    const mediaItems = mediaItemsRegex.exec(body);

    if (!mediaItems) {
        button.replaceWith(makeButton(`Not available from ${libraryName}.`, searchUrl));
        return;
    } else {
        const results = JSON.parse(mediaItems[1]);
        for (const resultId in results) {
            const result = results[resultId];
            console.debug(`FindReads Result: ${resultId}`);
            console.debug(`  Title: ${result.title}`);
            console.debug(`  Creator: ${result.creator}`);
            console.debug(`  Available: ${result.availableCopies} (${result.holdsCount} holds on ${result.ownedCopies} copies, estimated wait ${result.estimatedWaitDays} days)`);
        }

        if (Object.keys(results).length !== 1) {
            button.replaceWith(makeButton(`Multiple results from ${libraryName}.`, searchUrl));
            return;
        }

        for (const resultId in results) {
            const result = results[resultId];

            let availability = "Not available from";
            let link = searchUrl;
            if (result.availableCopies > 0) {
                availability = `${result.availableCopies} available at`;
                link = `https://${library}/media/${encodeURIComponent(resultId)}`;
            } else if (result.ownedCopies > 0) {
                availability = `On hold (${result.holdsCount}/${result.ownedCopies}) at`;
                link = `https://${library}/media/${encodeURIComponent(resultId)}`;
            }

            button.replaceWith(makeButton(`${availability} ${libraryName}.`, link));
            return;
        }
    }
}

function makeButton(labelText, destination) {
    const label = document.createElement("span");
    label.className = "Button__labelItem";
    label.textContent = labelText;

    const button = document.createElement("a");
    button.className = "Button Button--secondary Button--small Button--block";
    if (destination) {
        button.href = destination;
    }
    button.title = labelText;
    button.appendChild(label);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "Button__container Button__container--block";
    buttonContainer.appendChild(button);

    const outerButton = document.createElement("div");
    outerButton.className = "BookActions__button";
    outerButton.appendChild(buttonContainer);

    return outerButton;
}

go();
