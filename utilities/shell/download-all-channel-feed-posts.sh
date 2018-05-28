#!/usr/bin/env bash

set -e
set -u
set -o pipefail

# ---
#
# Download all Twitch channel feed posts.
#
# Used as a backup tool for when Twitch kills off the channel feed.
# This script might not be useful after that, circa June 2018.
# https://help.twitch.tv/customer/portal/articles/2936769-removing-channel-feed-and-pulse
#
# Outputs a json file with all posts and post details in an array.
#
# NOTE: does not get each post's comments.
#
# NOTE: requires Twitch authorization environment variables to have been set up.
#
# ---

function die() {
	echo -E "FATAL" "$@" >&2
	exit 1
}

function fetchCurrentPage() {
	curl \
	--silent \
	--header 'Accept: application/vnd.twitchtv.v5+json' \
	--header "Client-ID: ${TWITCH_APP_CLIENT_ID}" \
	--header "Authorization: OAuth ${TWITCH_APP_ACCESS_TOKEN}" \
	"https://api.twitch.tv/kraken/feed/${TWITCH_USER_ID}/posts?limit=100&cursor=${TWITCH_CHANNEL_FEED_POSTS_CURSOR}"
}

function downloadCurrentPage() {
	# TODO: use local variables.
	declare TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT="${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_PREFIX}${TWITCH_CHANNEL_FEED_POSTS_OFFSET}${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_SUFFIX}"
	fetchCurrentPage > "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT"

	# TODO: use local variables.
	TWITCH_CHANNEL_FEED_POSTS_CURSOR="$(cat "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT" | jq --raw-output '._cursor')"
	TWITCH_CHANNEL_FEED_POSTS_COUNT="$(cat "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT" | jq --raw-output '.posts | length')"
	TWITCH_CHANNEL_FEED_POSTS_OFFSET="$(( "$TWITCH_CHANNEL_FEED_POSTS_OFFSET" + "$TWITCH_CHANNEL_FEED_POSTS_COUNT" ))"

	# echo "TWITCH_CHANNEL_FEED_POSTS_CURSOR" "$TWITCH_CHANNEL_FEED_POSTS_CURSOR"
	# echo "TWITCH_CHANNEL_FEED_POSTS_COUNT" "$TWITCH_CHANNEL_FEED_POSTS_COUNT"
	# echo "TWITCH_CHANNEL_FEED_POSTS_OFFSET" "$TWITCH_CHANNEL_FEED_POSTS_OFFSET"
}

function main() {
	# Step 0: check input.
	[[ -z "$TWITCH_USER_ID" ]] && die "Environment variable not set" "TWITCH_USER_ID"
	[[ -z "$TWITCH_APP_CLIENT_ID" ]] && die "Environment variable not set" "TWITCH_APP_CLIENT_ID"
	[[ -z "$TWITCH_APP_ACCESS_TOKEN" ]] && die "Environment variable not set" "TWITCH_APP_ACCESS_TOKEN"

	# Step 1: setup.
	# TODO: use local variables.
	declare TWITCH_CHANNEL_FEED_POSTS_TIMESTAMP="$(date -u +%FT%TZ | tr -d ':')"
	declare TWITCH_CHANNEL_FEED_POSTS_COUNT="0"
	declare TWITCH_CHANNEL_FEED_POSTS_OFFSET="0"
	declare TWITCH_CHANNEL_FEED_POSTS_CURSOR=""
	declare TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_PREFIX="twitch.channel-feed.posts.${TWITCH_USER_ID}.${TWITCH_CHANNEL_FEED_POSTS_TIMESTAMP}."
	declare TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_SUFFIX=".json"
	declare TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_LIST="${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_PREFIX}*${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_SUFFIX}"
	declare TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_ALL="${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_PREFIX}all${TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_SUFFIX}"

	# Step 2: run once.
	downloadCurrentPage

	# Step 3: loop.
	while [[ ! -z "$TWITCH_CHANNEL_FEED_POSTS_CURSOR" ]];
	do
		downloadCurrentPage
	done

	# Step 3: concatenate.
	cat $TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_LIST | jq --slurp 'map(.posts) | add | sort_by(.created_at)' > "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_ALL"

	# Done!
	cat "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_ALL" | jq --arg path "$TWITCH_CHANNEL_FEED_POSTS_PAGE_OUTPUT_ALL" '{ path: $path, count: length, first: .[0].created_at, last: .[-1].created_at }'
}

main
