# [botten-nappet](https://joelpurra.com/projects/botten-nappet/)

A Twitch bot and streaming tool.



## Usage

To be done.



## Configuration

The server code expects these environment variables to be set. See steps below for manual/developer steps to set/retrieve the values.

```shell
export TWITCH_APP_ACCESS_TOKEN='configure me'
export TWITCH_USER_ACCESS_TOKEN='configure me'
export TWITCH_USER_NAME='configure me'
export TWITCH_USER_ID='configure me'
```



## Installation

```shell
npm install

npm run --silent build
```



## Running the server

```shell
npm run --silent start
```



## Development

Follow [git-flow](https://danielkummer.github.io/git-flow-cheatsheet/) and use [git-flow-avh](https://github.com/petervanderdoes/gitflow-avh).

```shell
# Make sure git-flow is initialized.
git flow init -d

# Clean, test, build, watch javascript code for changes.
npm run --silent clean
npm run --silent build
npm run --silent test
npm run --silent watch

# Set logging parameters.
export BOTTEN_NAPPET_LOGGING_LEVEL='trace'
export BOTTEN_NAPPET_LOG_FILE="${TMPDIR}.botten-nappet.log"

# Pipe log output to file.
npm run --silent start | tee "$BOTTEN_NAPPET_LOG_FILE"

# New terminal window: watch log file and pretty print.
tail -f "$BOTTEN_NAPPET_LOG_FILE" | ./node_modules/.bin/pino
```



## Developer environment setup

The below steps assume a `bash` shell.


### Prepare variables

```shell
# Create a Twitch application, get your client id/secret from there.
open 'https://dev.twitch.tv/dashboard/apps/create'

# Your application details.
export TWITCH_APP_CLIENT_ID='your twitch client id here'
export TWITCH_APP_CLIENT_SECRET='your twitch client secret here'

# Set OAuth landing page for authorized users.
# NOTE: use the same address here as in the applcation registration.
# NOTE: this should be one of your own domains/websites.
# TODO: build a page which accepts the authorized user's code automatically.
export TWITCH_APP_OAUTH_REDIRECT_URL='https://example.com/'

# Set username to gain access to.
export TWITCH_USER_NAME='your-twitch-username'
```

```shell
export TWITCH_APP_OAUTH_REDIRECT_URL_ENCODED="$(python -c "import sys, urllib as ul; print ul.quote_plus(sys.argv[1])" "$TWITCH_APP_OAUTH_REDIRECT_URL")"
```


### Request application token

```shell
# Used for application-level access to the Twitch api.
export TWITCH_APP_ACCESS_TOKEN="$(curl --data "client_id=${TWITCH_APP_CLIENT_ID}&client_secret=${TWITCH_APP_CLIENT_SECRET}&grant_type=client_credentials&scope=channel_feed_read" 'https://api.twitch.tv/kraken/oauth2/token' | jq --raw-output '.access_token')"
```

### Request user access token

```shell
# Retrieve the user id by username.
export TWITCH_USER_ID="$(curl --header "Authorization: Bearer ${TWITCH_APP_ACCESS_TOKEN}" "https://api.twitch.tv/helix/users?login=${TWITCH_USER_NAME}" | jq --raw-output '.data[0].id')";

# Set cross-site request forgery for the request.
# NOTE: should be re-created per authorization request.
export TWITCH_USER_CSRF_STATE="$(echo "unguessable $(date) even more unguessable" | shasum --algorithm 512 | cut -d ' ' -f 1)"

# NOTE: this step opens the browser.
# Click authorize, and wait for the page to load.
open "https://api.twitch.tv/kraken/oauth2/authorize?client_id=${TWITCH_APP_CLIENT_ID}&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL_ENCODED}&response_type=code&scope=channel_feed_read%20channel_subscriptions%20chat_login&force_verify=true&state=${TWITCH_USER_CSRF_STATE}"

# NOTE: verify the state in the redirect url against this value.
echo "TWITCH_USER_CSRF_STATE" "$TWITCH_USER_CSRF_STATE"

# NOTE: unset the CSRF state so that it can only be used once.
export -n TWITCH_USER_CSRF_STATE

# NOTE: this code assumes you have the authorized redirect url in your clipboard.
# NOTE: this code is only temporary, used to get the real user access token.
export TWITCH_USER_AUTHORIZATION_CODE="$(pbpaste | sed -E -e 's/.*\bcode=([a-zA-Z0-9]*)\b.*/\1/')"

# Finally get the user access token.
export TWITCH_USER_ACCESS_TOKEN="$(curl --data "client_id=${TWITCH_APP_CLIENT_ID}&client_secret=${TWITCH_APP_CLIENT_SECRET}&code=${TWITCH_USER_AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${TWITCH_APP_OAUTH_REDIRECT_URL_ENCODED}" 'https://api.twitch.tv/kraken/oauth2/token' | jq --raw-output '.access_token')"
```


### Shutting down the development environment

Best practice includes revoking the above temporary development tokens.

```shell
# Revoke application access token.
curl --data "client_id=${TWITCH_APP_CLIENT_ID}&token=${TWITCH_APP_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/oauth2/revoke'

# Revoke user access token.
curl --data "client_id=${TWITCH_APP_CLIENT_ID}&token=${TWITCH_USER_ACCESS_TOKEN}" 'https://api.twitch.tv/kraken/oauth2/revoke'
```

```shell
# Unset all of the exported variables.
export -n TWITCH_APP_CLIENT_ID
export -n TWITCH_APP_CLIENT_SECRET
export -n TWITCH_APP_OAUTH_REDIRECT_URL
export -n TWITCH_USER_NAME
export -n TWITCH_APP_OAUTH_REDIRECT_URL_ENCODED
export -n TWITCH_APP_ACCESS_TOKEN
export -n TWITCH_USER_ID
export -n TWITCH_USER_CSRF_STATE
export -n TWITCH_USER_AUTHORIZATION_CODE
export -n TWITCH_USER_ACCESS_TOKEN
```



## Acknowledgements

- thor10768765 on Twitch for inspiration and pushing me to start this project.



---

[botten-nappet](https://joelpurra.com/projects/botten-nappet/) Copyright &copy; 2018 [Joel Purra](https://joelpurra.com/). Released under [GNU Affero General Public License version 3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl.html). [Your donations are appreciated!](https://joelpurra.com/donate/)
