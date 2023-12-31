'use strict';


////////////////
// Google API //
////////////////


// Get the URL to log in at google.com
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


// Get music sheet files in Google Drive
async function googleApiGetFiles()
{
	const params = new URLSearchParams({
		fields: 'files(id,name)',
		pageSize: 1000,
		spaces: 'appDataFolder',
	});

	return googleApiFetchJson(
		'Getting music sheets',
		`${GOOGLE_API_BASE_URL}/drive/v3/files?${params}`
	);
}


// Post new music sheet file in Google Drive
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


//////////
// Main //
//////////


async function main()
{
	// Initialize login link
	document.getElementById('login').href = googleUiUrlAuthorizationToken();

	// Initialize toolbar buttons
	document.getElementById('toolLogOut').onclick = toolLogOut;
	document.getElementById('toolNewSheet').onclick = toolNewSheet;

	keepCookieLoop();

	const loggedIn = await tryLoginIfNotThenShowUi();

	// Show the toolbar
	showElement(document.getElementById('tools'), true);

	// Stop if not logged in
	if (!loggedIn)
		return;

	// Get files or stop
	const filesObj = await googleApiGetFiles();
	if (filesObj === null)
		return;

	// Display each file
	const sheetLinks = document.getElementById('sheetLinks');
	sheetLinks.innerText = '';
	for (const file of filesObj.files) {
		const sheetLink = document.createElement('a');
		const params = new URLSearchParams({
			id: file.id,
		});
		sheetLink.href = `${HOME_PATH}/sheet?${params}`;
		sheetLink.classList = 'wideBox sheet';
		sheetLink.innerText = file.name;
		sheetLinks.appendChild(sheetLink);
	}

	// Display a hint if there are no files
	if (filesObj.files.length === 0)
		customAlert('Click the plus button below to create a music sheet', 'Ok');
}


main();
