'use strict';


///////////////
// Constants //
///////////////


// Useful for having multiple apps on one site and also OAuth (Credentials > Authorized redirect URIs)
const HOME_PATH = '/musicblanket';
const HOME_URL = `https://robbycbennett.github.io${HOME_PATH}`;

// Values for multi-part requests, like file metadata & data
const MULTIPART_BOUNDARY = 'BOUNDARY';
const MULTIPART_CONTENT_TYPE = `multipart/related; boundary=${MULTIPART_BOUNDARY}`;

// The most common base URL for Google
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com';

// Values specific to this client
// See https://console.cloud.google.com
const GOOGLE_API_CLIENT_ID = '574179869664-0vou1e6qhmohd6r3qbdgnhjq7fl2ngpr.apps.googleusercontent.com';
const GOOGLE_API_CLIENT_SECRET = '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';

// Cookie that lasts as long as we want it to
const COOKIE_GOOGLE_REFRESH_TOKEN = 'google-refresh-token';
const REFRESH_TOKEN_EXPIRATION_DURATION_SEC = 60 * 60 * 48; // 2 days

// Cookie that lasts as long as Google says, which is 1 hour at the time of writing this
const COOKIE_GOOGLE_ACCESS_TOKEN = 'google-access-token';


////////////////
// Google API //
////////////////


// Fetch JSON with the Google API, showing a loader while waiting
async function googleApiFetchJson(loaderText, resource, options={}, useAccessToken=true)
{
	if (useAccessToken) {
		// Get access token if it exists, otherwise try to refresh it
		let accessToken = getCookie(COOKIE_GOOGLE_ACCESS_TOKEN);
		if (accessToken === null) {
			// Try to refresh the token or fail
			const results = await googleApiPostTokenFromRefreshToken();
			if (results === null)
				return null;

			// Validate parameter: access_token
			accessToken = results.access_token;
			if (typeof accessToken !== 'string')
				return false;

			// Validate paramter: expires_in
			const expirationDurationSec = results.expires_in;
			if (typeof expirationDurationSec !== 'number' || isNaN(expirationDurationSec))
				return false;

			// Remember the newly refreshed access token
			setCookie(COOKIE_GOOGLE_ACCESS_TOKEN, accessToken, expirationDurationSec);
		}

		// Set authorization header
		if (options.headers === undefined)
			options.headers = new Headers();
		options.headers.append('Authorization', `Bearer ${accessToken}`);
	}

	// Show loader with the loader text
	const loader = document.getElementById('loader');
	document.getElementById('loaderText').innerText = loaderText;
	showElement(loader, true);

	// Get JSON object or null
	const result = await fetch(resource, options)
		.then(async res => {
			const body = await res.json();
			return (body.error === undefined) ? body : null;
		})
		.catch(() => null);

	// Hide loader
	showElement(loader, false);

	return result;
}


// Create an access token and refresh token from an authorization code from logging in just now
async function googleApiPostTokenFromCode(code)
{
	const params = new URLSearchParams({
		client_id: GOOGLE_API_CLIENT_ID,
		client_secret: GOOGLE_API_CLIENT_SECRET,
		code: code,
		grant_type: 'authorization_code',
		redirect_uri: HOME_URL,
	});

	const useAccessToken = false;

	return googleApiFetchJson(
		'Getting access token & refresh token',
		`https://oauth2.googleapis.com/token?${params}`,
		{
			method: 'POST',
		},
		useAccessToken
	);
}


// Create an access token from the existing refresh token
async function googleApiPostTokenFromRefreshToken()
{
	// Get refresh token or fail
	const refreshToken = getCookie(COOKIE_GOOGLE_REFRESH_TOKEN);
	if (refreshToken === null)
		return null;

	const params = new URLSearchParams({
		client_id: GOOGLE_API_CLIENT_ID,
		client_secret: GOOGLE_API_CLIENT_SECRET,
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
	});

	// NOTE: the useActionToken parameter must be false to avoid infinite recursion
	return googleApiFetchJson(
		'Refreshing access token',
		`https://oauth2.googleapis.com/token?${params}`,
		{
			method: 'POST',
		},
		false
	);
}


// Prepare the body of a Google API request using the file metadata and data
function googleApiPrepareMultipartBody(metadata, data)
{
	return `\
--${MULTIPART_BOUNDARY}\r\n\
Content-Type: application/json; charset=UTF-8\r\n\
\r\n\
${metadata}\r\n\
--${MULTIPART_BOUNDARY}\r\n\
Content-Type: application/json\r\n\
\r\n\
${data}\r\n\
--${MULTIPART_BOUNDARY}--\r\n\
	`;
}


/////////////
// Cookies //
/////////////


function hasCookie(name)
{
	const pattern = new RegExp(`${name}=(.*?)(;|$)`);
	return pattern.test(document.cookie);
}


function getCookie(name)
{
	const pattern = new RegExp(`${name}=(.*?)(;|$)`);
	const match = pattern.exec(document.cookie);
	return (match !== null) ? match[1] : null;
}


function setCookie(name, value, expirationDurationSec)
{
	document.cookie = `${name}=${value}; max-age=${expirationDurationSec}; path=${HOME_PATH};`;
}


function deleteCookie(name)
{
	document.cookie = `${name}=0; max-age=0; path=${HOME_PATH};`;
}


///////////
// Login //
///////////


// Keep the cookie by extending its life
function keepCookie() {
	// Get value or stop
	const value = getCookie(COOKIE_GOOGLE_REFRESH_TOKEN);
	if (value == null)
		return;

	// Extend
	setCookie(COOKIE_GOOGLE_REFRESH_TOKEN, value, REFRESH_TOKEN_EXPIRATION_DURATION_SEC);
}


// Continuously keep the cookie
function keepCookieLoop()
{
	keepCookie();

	const milliseconds = 1000 * 60 * 5; // 5 minutes
	setInterval(keepCookie, milliseconds);
}


// Login using the URL parameters that may exist, unless the cookie already exists
async function loggedInOrLogInWithUrlParams()
{
	// Get existing URL search parameters
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');

	// If there is no URL code, return whether or not the refresh token exists
	if (code === null)
		return hasCookie(COOKIE_GOOGLE_REFRESH_TOKEN);

	// Delete login URL search parameters
	params.delete('code');
	params.delete('scope');
	const newUrl = (params.size > 0) ? `${window.location.pathname}?${params}` : window.location.pathname;
	window.history.replaceState(null, '', newUrl);

	// Create tokens from the code or fail
	const results = await googleApiPostTokenFromCode(code);
	if (results === null)
		return false;

	// Validate parameter: access_token
	const accessToken = results.access_token;
	if (typeof accessToken !== 'string')
		return false;

	// Validate parameter: refresh_token
	const refreshToken = results.refresh_token;
	if (typeof refreshToken !== 'string')
		return false;

	// Validate paramter: expires_in
	const accessTokenExpirationDurationSec = results.expires_in;
	if (typeof accessTokenExpirationDurationSec !== 'number' || isNaN(accessTokenExpirationDurationSec))
		return false;

	// Create all Google API cookies
	setCookie(COOKIE_GOOGLE_REFRESH_TOKEN, accessToken, REFRESH_TOKEN_EXPIRATION_DURATION_SEC);
	setCookie(COOKIE_GOOGLE_ACCESS_TOKEN, accessToken, accessTokenExpirationDurationSec);

	return true;
}


// Try to login if not already, showing the appropriate logged in/out UI
async function tryLoginIfNotThenShowUi()
{
	const loggedIn = await loggedInOrLogInWithUrlParams();

	for (const element of document.getElementsByClassName('loggedOut'))
		showElement(element, !loggedIn);
	for (const element of document.getElementsByClassName('loggedIn'))
		showElement(element, loggedIn);

	return loggedIn;
}


function logOut()
{
	// Delete all Google API cookies
	deleteCookie(COOKIE_GOOGLE_REFRESH_TOKEN);
	deleteCookie(COOKIE_GOOGLE_ACCESS_TOKEN);

	// If already home, just refresh the UI
	if (window.location.pathname === `${HOME_PATH}/`)
		tryLoginIfNotThenShowUi();
	// Otherwise, go home
	else
		window.location.href = HOME_PATH;
}


//////////////////////
// Create & Show UI //
//////////////////////


function customAlert(message, closeText, dangerText=undefined, dangerFunction=undefined)
{
	// Set text
	const alertText = document.getElementById('alertText');
	alertText.innerText = message;

	// Show and focus
	const alert = document.getElementById('alert');
	showElement(alert, true);
	alert.setAttribute('tabindex', '0');
	alert.focus();

	// Close button
	const alertClose = document.getElementById('alertClose');
	alertClose.innerText = closeText;
	if (alertClose.onclick === null) {
		alertClose.onclick = function() {
			showElement(alert, false);
		};
	}

	// Danger button
	const alertDanger = document.getElementById('alertDanger');
	if (dangerText === undefined || dangerFunction === undefined) {
		showElement(alertDanger, false);
	}
	else {
		alertDanger.innerText = dangerText;
		alertDanger.onclick = function() {
			showElement(alert, false);
			dangerFunction();
		};
		showElement(alertDanger, true);
	}
}


function showElement(element, shouldShow)
{
	if (shouldShow)
		element.classList.remove('hidden');
	else
		element.classList.add('hidden');
}


/////////////
// Toolbar //
/////////////


function toolLogOut()
{
	customAlert('Do you want to log out?', 'Stay logged in', 'Log out', logOut);
}
