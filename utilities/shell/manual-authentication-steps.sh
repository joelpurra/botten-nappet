echo "Do not execute this file directly; instead copy-paste examples as needed." >&2
exit 1

# NOTE: requires Twitch application environment variables to be set.
# See "Prepare variables" in the main readme file.


# ---


# Get an application access token.
# Required: TWITCH_APP_CLIENT_ID
# Required: TWITCH_APP_CLIENT_SECRET
export TWITCH_APP_ACCESS_TOKEN="$(curl --data "client_id=${TWITCH_APP_CLIENT_ID}&client_secret=${TWITCH_APP_CLIENT_SECRET}&grant_type=client_credentials&scope=channel_feed_read" 'https://api.twitch.tv/kraken/oauth2/token' | jq --raw-output '.access_token')"

# Optional: Revoke an application access token.
# Required: TWITCH_APP_CLIENT_ID
# Required: TWITCH_APP_ACCESS_TOKEN
curl --data "client_id=${TWITCH_APP_CLIENT_ID}&token=${TWITCH_APP_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/oauth2/revoke'


# ---


# Sample application access token usage for different Twitch APIs.
# Required:
curl --header "Authorization: Bearer ${TWITCH_APP_ACCESS_TOKEN}" 'https://api.twitch.tv/helix/'

curl --header "Authorization: OAuth ${TWITCH_APP_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/'

curl --header "Authorization: Bearer ${TWITCH_APP_ACCESS_TOKEN}" 'https://api.twitch.tv/helix/webhooks/hub'


# ---


# Get the user id from user name.
# Required: TWITCH_APP_ACCESS_TOKEN
# Required: TWITCH_USER_NAME
export TWITCH_USER_ID="$(curl --header "Authorization: Bearer ${TWITCH_APP_ACCESS_TOKEN}" "https://api.twitch.tv/helix/users?login=${TWITCH_USER_NAME}" | jq --raw-output '.data[0].id')";


# ---


# Authorize a user in your application.
# Required: TWITCH_APP_CLIENT_ID
# Required: TWITCH_APP_CLIENT_SECRET
# Required: TWITCH_APP_OAUTH_REDIRECT_URL
# Required:
# Step 1: setup.
export CSRF_STATE="$(echo "unguessable $(date) even more unguessable" | shasum --algorithm 512 | cut -d ' ' -f 1)"
function urlencode() { python -c "import sys, urllib as ul; print ul.quote_plus(sys.argv[1]);"; }
export TWITCH_APP_OAUTH_REDIRECT_URL_URLENCODED="$(urlencode "$TWITCH_APP_OAUTH_REDIRECT_URL")"

# Step 2: open up the browser for application authorization.
open "https://api.twitch.tv/kraken/oauth2/authorize?client_id=${TWITCH_APP_CLIENT_ID}&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL_URLENCODED}&response_type=code&scope=channel_feed_read%20channel_subscriptions%20chat_login&force_verify=true&state=${CSRF_STATE}"

# Step 3: copy the url after the user has been redirected, then execute this line.
export TWITCH_USER_AUTHORIZATION_CODE="$(pbpaste | sed -E -e 's/.*\bcode=([a-zA-Z0-9]*)\b.*/\1/')"

# Step 4: retrieve the actual user access token.
# NOTE: This can be stored and reused long-term.
export TWITCH_USER_ACCESS_TOKEN="$(curl --data "client_id=${TWITCH_APP_CLIENT_ID}&client_secret=${TWITCH_APP_CLIENT_SECRET}&code=${TWITCH_USER_AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL_URLENCODED}" 'https://api.twitch.tv/kraken/oauth2/token' | jq --raw-output '.access_token')"

# Optional: test the access by requesting used details.
# Required: user_read scope.
curl --header "Authorization: OAuth ${TWITCH_USER_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/user'

# Optional: revoke the user access token.
curl --data "client_id=${TWITCH_APP_CLIENT_ID}&token=${TWITCH_USER_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/oauth2/revoke'


# ---
