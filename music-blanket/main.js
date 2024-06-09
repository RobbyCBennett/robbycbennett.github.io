// @ts-check
'use strict';


////////////////
// Google API //
////////////////


/**
 * Get the URL to log in at google.com
 */
function googleUiUrlAuthorizationToken()
{
	const params = new URLSearchParams({
		access_type: 'offline',
		client_id: GOOGLE_API_CLIENT_ID,
		prompt: 'consent',
		redirect_uri: HOME_URL,
		response_type: 'code',
		scope: `${GOOGLE_API_BASE_URL}/auth/drive.appdata`,
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}


/**
 * Get data of a music sheet files in Google Drive and save it in the object
 * @param {string} id of the music sheet
 * @param {string} name of the music sheet
 * @param {number} numberOutOfTotal number from 1 to total
 * @param {number} totalCount number of files
 */
async function googleApiGetFileDataWithProgress(id, name, numberOutOfTotal, totalCount)
{
	const params = new URLSearchParams({
		alt: 'media',
	});

	const data = await googleApiFetchJson(
		`Getting music sheet ${numberOutOfTotal} of ${totalCount}`,
		`Failed to get music sheet ${numberOutOfTotal} of ${totalCount}`,
		`${GOOGLE_API_BASE_URL}/drive/v3/files/${id}?${params}`
	);

	return {
		name: name,
		data: data,
	};
}


/**
 * Get id and name of all music sheet files in Google Drive
 * @returns {Promise<{files: {id: string, name: string}[]} | null>}
 */
async function googleApiGetFilesMetadata()
{
	// TODO do multiple requests if there are more than 1000 music sheets

	const params = new URLSearchParams({
		fields: 'files(id,name)',
		pageSize: '1000',
		spaces: 'appDataFolder',
	});

	return googleApiFetchJson(
		'Getting names of music sheets',
		'Failed to get names of music sheets',
		`${GOOGLE_API_BASE_URL}/drive/v3/files?${params}`
	);
}


/**
 * Post new music sheet file in Google Drive
 */
async function googleApiPostFile()
{
	const params = new URLSearchParams({
		uploadType: 'multipart',
	});

	const metadata = JSON.stringify({
		name: 'New Song',
		parents: ['appDataFolder'],
		mimeType: 'application/json',
	});

	const data = JSON.stringify({
		lines: [
			[
				{
					'beginRepeat': false,
					'endRepeat': false,
					'columns': [
						[
							'',
							'',
							'',
							'',
							'',
							''
						],
					],
				},
			],
		],
	});

	const body = googleApiPrepareMultipartBody(metadata, data);

	return googleApiFetchJson(
		'Creating music sheet',
		'Failed to create music sheet',
		`${GOOGLE_API_BASE_URL}/upload/drive/v3/files?${params}`,
		{
			method: 'POST',
			body: body,
			headers: new Headers({'Content-Type': MULTIPART_CONTENT_TYPE}),
		}
	);
}


/////////////
// Toolbar //
/////////////


/**
 * Toolbar action: new music sheet
 */
async function toolNewSheet()
{
	// Post the new file or fail
	const newFile = await googleApiPostFile();
	if (newFile === null)
		return;

	// Go to the sheet and start editing it
	const params = new URLSearchParams({
		id: newFile.id,
		edit: 'true',
	});
	window.location.href = `${HOME_PATH}/sheet?${params}`;
}


/**
 * Toolbar action: download all music sheets as JSON
 */
async function toolDownloadAll()
{
	// Get files or stop
	const filesObj = await googleApiGetFilesMetadata();
	if (filesObj === null || filesObj.files.length === 0)
		return;

	// Build the queue of files to download by traversing in reverse order
	let numberOutOfTotal = 1;
	const total = filesObj.files.length;
	const requestInfoQueue = [];
	for (let i = filesObj.files.length - 1; i > -1; i--) {
		const file = filesObj.files[i];
		requestInfoQueue.push({
			id: file.id,
			name: file.name,
			numberOutOfTotal: numberOutOfTotal,
		});
		numberOutOfTotal++;
	}

	// TODO support more than QUERIES_PER_MINUTE total queries

	// Send requests to download them all
	/** @type {Promise<{name: string, data: any}>[]} */
	const requestPromises = [];
	for (let i = 0; i < QUERIES_PER_MINUTE; i++) {
		if (requestInfoQueue.length === 0)
			break;
		/** @ts-ignore @type {{id: string, name: string, numberOutOfTotal: number}} */
		const requestInfo = requestInfoQueue.pop();
		requestPromises.push(googleApiGetFileDataWithProgress(
			requestInfo.id,
			requestInfo.name,
			requestInfo.numberOutOfTotal,
			total,
		));
	}

	// Wait for them all to download
	const allSheets = await Promise.all(requestPromises);

	// Show a popup if there were any failures
	let failures = 0;
	for (const sheet of allSheets)
		if (!sheet.data)
			failures++;
	if (failures === 1)
		customAlert('Failed to download the only music sheet', 'Ok');
	else if (failures)
		customAlert(`Failed to download ${failures} of ${total} music sheets`, 'Ok');

	// Stringify and download the content as an array
	const anchor = document.createElement('a');
	anchor.download = 'music-blanket.json';
	anchor.href = window.URL.createObjectURL(new Blob(
		[JSON.stringify(allSheets)],
		{ type: 'application/json' },
	));
	anchor.click();
}


/**
 * Toolbar action: upload all music sheets from JSON, replacing the data
 */
async function toolUploadAll()
{
	// TODO
}

//////////
// Main //
//////////


/**
 * Main function of the home page /
 */
async function main()
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Initialize login link
	if (element = document.getElementById('login'))
		/** @type {HTMLAnchorElement} */ (element).href = googleUiUrlAuthorizationToken();

	// Initialize toolbar buttons
	if (element = document.getElementById('toolLogOut'))
		element.onclick = toolLogOut;
	if (element = document.getElementById('toolNewSheet'))
		element.onclick = toolNewSheet;
	if (element = document.getElementById('toolDownloadAll'))
		element.onclick = toolDownloadAll;
	if (element = document.getElementById('toolUploadAll'))
		element.onclick = toolUploadAll;

	keepCookieLoop();

	const loggedIn = await tryLoginIfNotThenShowUi();

	// Show the toolbar
	if (element = document.getElementById('tools'))
		showElement(element, true);

	// Stop if not logged in
	if (!loggedIn)
		return;

	// Get files or stop
	const filesObj = await googleApiGetFilesMetadata();
	if (filesObj === null)
		return;

	// Display each file
	if (element = document.getElementById('sheetLinks')) {
		element.innerText = '';
		for (const file of filesObj.files) {
			const sheetLink = document.createElement('a');
			const params = new URLSearchParams({
				id: file.id,
			});
			sheetLink.href = `${HOME_PATH}/sheet?${params}`;
			// sheetLink.classList = 'wideBox sheet';
			// @ts-ignore
			sheetLink.classList = 'wideBox sheet';
			sheetLink.innerText = file.name;
			element.appendChild(sheetLink);
		}
	}

	// Display a hint if there are no files
	if (filesObj.files.length === 0)
		customAlert('Click the plus button below to create a music sheet', 'Ok');
}


main();
