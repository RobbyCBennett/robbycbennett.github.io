// @ts-check
'use strict';


///////////////
// Constants //
///////////////


// Useful for having multiple apps on one site and also OAuth (Credentials > Authorized redirect URIs)
const HOME_PATH = '/music-blanket';
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


/**
 * Fetch JSON with the Google API, showing a loader while waiting
 * @param {string} loaderText
 * @param {string} errorText for error messages like 'Failed to get music sheets'
 * @param {string} url
 * @param {RequestInit} options
 * @param {boolean} useAccessToken
 */
async function googleApiFetchJson(loaderText, errorText, url, options={}, useAccessToken=true)
{
	/** @type {HTMLElement | null} */
	let element = null;

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
		/** @type {Headers} */ (options.headers).append('Authorization', `Bearer ${accessToken}`);
	}

	// Show loader with the loader text
	if (element = document.getElementById('loaderText'))
		element.innerText = loaderText;
	if (element = document.getElementById('loader'))
		showElement(element, true);

	// Get JSON object or null
	const result = await fetch(url, options)
		.then(async res => {
			const body = await res.json();
			return (body.error === undefined) ? body : null;
		})
		.catch(() => null);

	// Hide loader
	if (element = document.getElementById('loader'))
		showElement(element, false);

	// Show error popup
	if (result === null)
		customAlert(errorText, 'Ok');

	return result;
}


/**
 * Create an access token and refresh token from an authorization code from logging in just now
 * @param {string} code
 */
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
		'Failed to get access token & refresh token',
		`https://oauth2.googleapis.com/token?${params}`,
		{
			method: 'POST',
		},
		useAccessToken,
	);
}


/**
 * Create an access token from the existing refresh token
 */
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

	const useAccessToken = false;

	// NOTE: the useActionToken parameter must be false to avoid infinite recursion
	return googleApiFetchJson(
		'Refreshing access token',
		'Failed to refresh access token',
		`https://oauth2.googleapis.com/token?${params}`,
		{
			method: 'POST',
		},
		useAccessToken,
	);
}


/**
 * Prepare the body of a Google API request using the file metadata and data
 * @param {string} metadata as stringified JSON
 * @param {string} data as stringified JSON
 */
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


/**
 * If a cookie of the name exists
 * @param {string} name
 */
function hasCookie(name)
{
	const pattern = new RegExp(`${name}=(.*?)(;|$)`);
	return pattern.test(document.cookie);
}


/**
 * Get the value of a cookie
 * @param {string} name
 */
function getCookie(name)
{
	const pattern = new RegExp(`${name}=(.*?)(;|$)`);
	const match = pattern.exec(document.cookie);
	return (match !== null) ? match[1] : null;
}


/**
 * Set or change a cookie
 * @param {string} name
 * @param {string} value
 * @param {number} expirationDurationSec in seconds
 */
function setCookie(name, value, expirationDurationSec)
{
	document.cookie = `${name}=${value}; max-age=${expirationDurationSec}; path=${HOME_PATH};`;
	if (!hasCookie(name))
		customAlert('Enable cookies', 'Ok');
}


/**
 * Delete a cookie
 * @param {string} name
 */
function deleteCookie(name)
{
	document.cookie = `${name}=0; max-age=0; path=${HOME_PATH};`;
}


///////////
// Login //
///////////


/**
 * Keep the cookie by extending its life
 */
function keepCookie() {
	// Get value or stop
	const value = getCookie(COOKIE_GOOGLE_REFRESH_TOKEN);
	if (value == null)
		return;

	// Extend
	setCookie(COOKIE_GOOGLE_REFRESH_TOKEN, value, REFRESH_TOKEN_EXPIRATION_DURATION_SEC);
}


/**
 * Continuously keep the cookie
 */
function keepCookieLoop()
{
	keepCookie();

	const milliseconds = 1000 * 60 * 5; // 5 minutes
	setInterval(keepCookie, milliseconds);
}


/**
 * Login using the URL parameters that may exist, unless the cookie already exists
 */
async function loggedInOrLogInWithUrlParams()
{
	// Get existing URL search parameters
	const params = new URLSearchParams(window.location.search);
	const code = params.get('code');

	// If there is no URL code, return whether or not the refresh token exists
	if (code === null)
		return hasCookie(COOKIE_GOOGLE_REFRESH_TOKEN) || hasCookie(COOKIE_GOOGLE_ACCESS_TOKEN);

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
	setCookie(COOKIE_GOOGLE_REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_EXPIRATION_DURATION_SEC);
	setCookie(COOKIE_GOOGLE_ACCESS_TOKEN, accessToken, accessTokenExpirationDurationSec);

	return true;
}


/**
 * Try to login if not already, showing the appropriate logged in/out UI
 */
async function tryLoginIfNotThenShowUi()
{
	const loggedIn = await loggedInOrLogInWithUrlParams();

	for (const element of document.getElementsByClassName('loggedOut'))
		showElement(element, !loggedIn);
	for (const element of document.getElementsByClassName('loggedIn'))
		showElement(element, loggedIn);

	return loggedIn;
}


/**
 * Delete cookies and either refresh the UI or go to the home page
 */
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


/**
 * Close the alert popup
 */
function onClickClose()
{
	/** @type {HTMLElement | null} */
	let element = null;

	if (element = document.getElementById('alert'))
		showElement(element, false);
}


/**
 * Like the alert function, but more pretty
 * @param {string} message
 * @param {string} closeText
 * @param {string | undefined} dangerText
 * @param {(() => any) | undefined} dangerFunction
 */
function customAlert(message, closeText, dangerText=undefined, dangerFunction=undefined)
{
	/** @type {HTMLElement | null} */
	let element = null;

	// Set text
	if (element = document.getElementById('alertText'))
		element.innerText = message;

	// Show and focus
	if (element = document.getElementById('alert')) {
		showElement(element, true);
		element.setAttribute('tabindex', '0');
		element.focus();
	}

	// Close button
	if (element = document.getElementById('alertClose')) {
		element.innerText = closeText;
		if (element.onclick === null)
			element.onclick = onClickClose;
	}

	// Danger button
	if (element = document.getElementById('alertDanger')) {
		if (dangerText === undefined || dangerFunction === undefined) {
			showElement(element, false);
		}
		else {
			element.innerText = dangerText;
			element.onclick = function() {
				/** @type {HTMLElement | null} */
				let element = null;

				if (element = document.getElementById('alert'))
					showElement(element, false);

				dangerFunction();
			};
			showElement(element, true);
		}
	}
}


/**
 * Show or hide an element
 * @param {Element} element
 * @param {boolean} shouldShow
 */
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


/**
 * Toolbar action: show a prompt to log out
 */
function toolLogOut()
{
	customAlert('Do you want to log out?', 'Stay logged in', 'Log out', logOut);
}
