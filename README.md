# [botten-nappet](https://joelpurra.com/projects/botten-nappet/)

A Twitch bot and streaming tool.



## Usage

To be done.



## Configuration

The server code expects these environment variables to be set. See steps below for manual/developer steps to set/retrieve the values.

```shell
export TWITCH_APP_CLIENT_ID='configure me'
export TWITCH_APP_CLIENT_SECRET='configure me'
export TWITCH_APP_OAUTH_REDIRECT_URL='configure me'
export TWITCH_USER_NAME='configure me'
export VIDY_API_ROOT_URL='https://sandbox.vidy.cn/'
export VIDY_API_KEY_ID='sandbox'
export VIDY_API_KEY_SECRET='sandbox'
export VIDY_VIDEO_LINK_BASE_URL='https://vidy.cn/v/'
export VIDY_SYSTEM_UUID='configure me'
export BOTTEN_NAPPET_SHARED_LOG_FILE="${TMPDIR}.botten-nappet.log"
export BOTTEN_NAPPET_BACKEND_DATABASE_URI="nedb://.../path/to/botten-nappet/database-directory"
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

# Modify the ZeroMQ port if running multiple instances.
#export BOTTEN_NAPPET_SHARED_ZMQ_ADDRESS="tcp://localhost:61611"

# Set logging parameters.
export BOTTEN_NAPPET_SHARED_LOGGING_LEVEL='trace'
export BOTTEN_NAPPET_SHARED_LOG_FILE="${TMPDIR}.botten-nappet.log"

# Start debugger. Connect to it using Google Chrome, see chrome://inspect/
# https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27
# Run "debug" for normal debugging, or "debug:break" to break on the first statement.
# NOTE: pipes log output to a file, which is pretty-printed separately.
npm run --silent debug

# New terminal window: watch log file and pretty print.
tail -f "$BOTTEN_NAPPET_SHARED_LOG_FILE" | ./node_modules/.bin/pino
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


### Shutting down the development environment

Best practice includes revoking the above temporary development tokens.

```shell
# Revoke user access token.
# TODO: curl local development revoke url.
```

```shell
# Unset all of the exported variables.
# NOTE: there might be more custom settings.
export -n TWITCH_APP_CLIENT_ID
export -n TWITCH_APP_CLIENT_SECRET
export -n TWITCH_APP_OAUTH_REDIRECT_URL
export -n TWITCH_USER_NAME
export -n VIDY_API_ROOT_URL
export -n VIDY_VIDEO_LINK_BASE_URL
export -n VIDY_API_KEY_ID
export -n VIDY_API_KEY_SECRET
export -n VIDY_SYSTEM_UUID
export -n BOTTEN_NAPPET_SHARED_LOG_FILE
export -n BOTTEN_NAPPET_BACKEND_DATABASE_URI
```



## Acknowledgements

- thor10768765 on Twitch for inspiration and pushing me to start this project.



---

[botten-nappet](https://joelpurra.com/projects/botten-nappet/) Copyright &copy; 2018 [Joel Purra](https://joelpurra.com/). Released under [GNU Affero General Public License version 3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl.html). [Your donations are appreciated!](https://joelpurra.com/donate/)
