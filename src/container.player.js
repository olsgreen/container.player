/*
 * ContainerPlayer - Implement regular & fullscreen background videos like a boss.
 *
 * Inspired by Benton Rochesters https://github.com/rochestb/jQuery.YoutubeBackground
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Version:  0.8.0
 *
 */

(function($, window, document) {

    var global = window.ContainerPlayer = {};

    if (typeof Object.create !== "function") {
        Object.create = function(obj) {
            function F() {}
            F.prototype = obj;
            return new F();
        };
    }

    var ContainerPlayer = {

        defaults: {
            autoplay: true,
            loop: true,
            muted: true,
            controls: false,
            ratio: 16 / 9,
            fitContainer: true,
            forceAspect: false,
        },

        init: function(el, userOptions) {
            var self = this;

            self.$window = $(window);

            if ('BODY' === el.tagName) {
                self.$container = $('<div class="container-player fullscreen-background"></div>');
                $(el).append(self.$container);
            } else {
                self.$container = $(el);
            }

            self.options = $.extend(true, {}, self.defaults, userOptions);
            
            self.ID = parseInt(Math.random() * 1000000);
            self.outerID = 'containerPlayerOuter' + self.ID;
            self.innerID = 'containerPlayerInner' + self.ID;
            self.overlayID = 'containerPlayerOverlay' + self.ID;

            self.createContainer();

            if (typeof this.options.youTube === 'object') {
                this.adapter = Object.create(YouTubeAdapter);
                self.$container.addClass('youtube');
            } else if (typeof this.options.html5 === 'object') {
                this.adapter = Object.create(HTML5Adapter);
                self.$container.addClass('html5');
            } else {
                throw "Invalid options passed, no adapter configuration found.";
            }

            this.adapter.init(this);

            // Listen for Resize Event
            self.$window.on('resize.ContainerPlayer' + self.ID, function() {
                self.resize();
            });

            self.resize(self);

            return self;
        },

        setDimensions: function($container) {
            this.options.width = $container.width();
            this.options.height = $container.height();
        },

        createContainer: function() {
            var self = this;

            /*jshint multistr: true */
            self.player = {};
            self.player.$outer = $('<div id="' + self.outerID + '" class="container-player-outer"></div>');
            self.player.$inner = $('<div id="' + self.innerID + '" class="container-player-inner"></div>');

            if (self.options.overlay) {
                self.player.$overlay = $('<div id="' + self.overlayID + '" class="container-player-overlay"></div>');

                if (typeof self.options.overlay.opacity !== "undefined") {
                    self.player.$overlay.css('opacity', self.options.overlay.opacity);
                }

                if (typeof self.options.overlay.color !== "undefined") {
                    self.player.$overlay.css('background-color', self.options.overlay.color);
                }

                if (typeof self.options.overlay.image !== "undefined") {
                    self.player.$overlay.css('background-image', 'url('+self.options.overlay.image+')');

                    if (typeof self.options.overlay.backgroundSize !== "undefined") {
                        self.player.$overlay.css('background-size', 'url('+self.options.overlay.backgroundSize+')');
                    }

                    if (typeof self.options.overlay.backgroundRepeat !== "undefined") {
                        self.player.$overlay.css('background-repeat', 'url('+self.options.overlay.backgroundRepeat+')');
                    }
                }

                self.$container.append(self.player.$overlay);
            }

            self.$container.append(self.player.$outer.append(self.player.$inner));
        },

        resize: function() {
            
            var self = this;

            self.setDimensions(self.$container);

            var pWidth, // player width, to be defined
                pHeight, // player height, tbd
                $YTPlayerPlayer = $('#' + self.innerID);

            if (self.options.forceAspect) {
                pHeight = (self.options.width / self.options.ratio).toFixed(3);
                self.$container.height(pHeight);

                $YTPlayerPlayer.width(self.options.width).css({
                    left: 0,
                    top: 0,
                    height: pHeight,
                });

                return;
            }

            if (self.options.fitContainer && (self.options.width / self.options.ratio < self.options.height)) {
                pWidth = Math.ceil(self.options.height * self.options.ratio); // get new player width
                $YTPlayerPlayer.width(pWidth).height(self.options.height).css({
                    left: (self.options.width - pWidth) / 2,
                    top: 0
                }); // player width is greater, offset left; reset top
            } else { // new video width < window width (gap to right)
                pHeight = Math.ceil(self.options.width / self.options.ratio); // get new player height
                $YTPlayerPlayer.width(self.options.width).height(pHeight).css({
                    left: 0,
                    top: (self.options.height - pHeight) / 2
                }); // player height is greater, offset top; reset left
            }

            $YTPlayerPlayer = null;
        },

        videoLoaded: function() {
            this.$container
                .addClass('loaded')
                .trigger('video.loaded', this);
        },

        videoPlaying: function() {
            this.$container
                .removeClass('paused')
                .addClass('playing')
                .trigger('video.playing', this);
        },

        videoPaused: function() {
            this.$container
                .removeClass('playing')
                .addClass('paused')
                .trigger('video.paused', this);
        },

        videoEnded: function() {
            this.$container
                .removeClass('playing')
                .trigger('video.ended', this);
        },

        play: function() {
            this.adapter.play();
        },

        pause: function() {
            this.adapter.pause();
        },

        goTo: function(secs) {
            this.adapter.goTo(secs);
        },
    },

    AbstactAdapter = {

        init: function(containerPlayer) {
            throw "Not implemented";
        },

        play: function() {
            throw "Not implemented";
        },

        pause: function() {
            throw "Not implemented";
        },

        goTo: function() {
            throw "Not implemented";
        }  
    },

    HTML5Adapter = {
        defaults: {
            html5: {
                sources: [
                    // ['video/mp4', 'http://my-server.com/path/to/video.mp4']
                    // ['video/webm', 'http://my-server.com/path/to/video.webm']
                ],
                props: {
                    preload: 'auto', // none | metadata | auto
                    crossorigin: null, // null | anonymous | use-credentials
                }
            }
        },

        init: function(containerPlayer) {
            var self = this;

            self.containerPlayer = containerPlayer;
            self.options = $.extend(true, {}, self.defaults, self.containerPlayer.options);

            // If sources aren't defined but a single src options is set the videos src property.
            if (typeof self.options.html5.src !== 'undefined' &&
                0 === self.options.html5.sources.length) {
                self.options.html5.props.src = self.options.html5.src;
            }

            //
            // Setup
            //

            // Poster
            if (typeof self.options.html5.poster !== "undefined") {
                self.containerPlayer.player.$outer.css('background-image', 'url('+self.options.html5.poster+')');
            }

            // Autoplay
            if (typeof self.options.html5.props.autoplay === "undefined") {
                self.options.html5.props.autoplay = self.options.autoplay;
            }

            // Loop
            if (typeof self.options.html5.props.loop === "undefined") {
                self.options.html5.props.loop = self.options.loop;
            }

            // Controls
            if (typeof self.options.html5.props.controls === "undefined") {
                self.options.html5.props.controls = self.options.controls;
            }

            // Controls
            if (typeof self.options.html5.props.muted === "undefined") {
                self.options.html5.props.muted = self.options.muted;
            }

            self.createHTML5Video();
        },

        createHTML5Video: function() {
            var $player = $('#' + this.innerID);
            this.$video = $("<video>Your browser doesn't support HTML5 video tag.</video>");
            this.$video.on('canplay playing pause', this.onPlayerStateChange.bind(this));

            // Video Properties
            for (var name in this.options.html5.props) {
                var value = this.options.html5.props[name];

                if (value) {
                    this.$video.prop(name, value);
                }
            }

            // Video Sources
            for (var source in this.options.html5.sources) {
                this.$video.append(
                    $('<source></source>')
                        .prop('src', this.options.html5.sources[source][1])
                        .prop('type', this.options.html5.sources[source][0])
                );
            }

            this.containerPlayer.player.$inner.append(this.$video);
        },

        onPlayerStateChange: function(event) {
            switch (event.type) {
                case 'canplay':
                    this.containerPlayer.videoLoaded();
                break;
                case 'playing':
                    this.containerPlayer.videoPlaying();
                break;
                case 'pause':
                    this.containerPlayer.videoPaused();
                break;
                case 'ended':
                    this.containerPlayer.videoEnded();
                break;
            }
        },

        play: function() {
            this.$video[0].play();
        },

        pause: function() {
            this.$video[0].pause();
        },

        goTo: function(secs) {
            this.$video[0].currentTime = secs;
        }
    },

    YouTubeAdapter = $.extend(Object.create(AbstactAdapter), {
        // Default settings for the adapter.
        defaults: {
            videoId: '',
            playerVars: {
                iv_load_policy: 3,
                modestbranding: 1,
                showinfo: 0,
                wmode: 'opaque',
                branding: 0,
                autohide: 1,
                rel: 0,
            }
        },

        init: function(containerPlayer) {
            var self = this;

            // Make a local reference to the player
            self.containerPlayer = containerPlayer;

            // Merge the default and user specified options.
            self.options = $.extend(
                true, {}, self.defaults, self.containerPlayer.options.youTube
            );

            // Poster
            if (typeof self.options.poster !== "undefined") {
                self.containerPlayer.player.$outer.css('background-image', 'url('+self.options.poster+')');
            }

            // Autoplay
            if (typeof self.options.playerVars.autoplay === "undefined") {
                self.options.playerVars.autoplay = self.containerPlayer.options.autoplay ? 1 : 0;
            }

            // Loop
            if (typeof self.options.playerVars.loop === "undefined") {
                self.options.playerVars.loop = self.options.loop ? 1 : 0;

                if (self.options.loop && typeof self.options.playerVars.playlist === "undefined") {
                    self.options.playerVars.playlist = self.containerPlayer.options.youTube.videoId;
                }
            }

            // Controls
            if (typeof self.options.playerVars.controls === "undefined") {
                self.options.playerVars.controls = self.containerPlayer.options.controls ? 1 : 0;
            }

            // Define the global YouTube scope for API loading.
            if (typeof global.YouTube === "undefined") {
                global.YouTube = {
                    apiLoading: false,
                    onApiLoad: $.Deferred(),
                };
            }

            // When the YouTube API is ready create a new player instance.
            self.whenApiIsReady(self.createPlayer.bind(self));

            // Load the YouTube API
            self.loadApi();
        },

        whenApiIsReady: function(callback) {
            // Immediatly make the callback if the YouTube API is loaded.
            if (typeof YT === 'object')  {
                callback();
                return;
            } 

            // Add the callback to the queue to be called once the API has loaded.
            global.YouTube.onApiLoad.done(function() { callback(); });
        },

        loadApi: function() {
            if (typeof YT === 'undefined' && global.YouTube.apiLoading === false) {
                global.YouTube.apiLoading = true;

                // Listen for the ready call from the YouTube API.                
                window.onYouTubeIframeAPIReady = function() {
                    window.onYouTubeIframeAPIReady = null;

                    // Resolve all of the callbacks that are currently 
                    // waiting for the API to finish loading.
                    global.YouTube.onApiLoad.resolve();
                };

                // Load Youtube API
                var tag = document.createElement('script'),
                head = document.getElementsByTagName('head')[0];

                if (window.location.origin == 'file://') {
                    tag.src = 'http://www.youtube.com/iframe_api';
                } else {
                    tag.src = '//www.youtube.com/iframe_api';
                }

                head.appendChild(tag);

                // Clean up Tags.
                head = null;
                tag = null;
            }
        },

        createPlayer: function() {
            var self = this;

            // Create a new YouTube player instance with our options.
            self.player = new YT.Player(self.containerPlayer.innerID, {
                videoId: self.options.videoId,
                playerVars: self.options.playerVars,
                events: {
                    'onReady': self.onPlayerReady.bind(self),
                    'onStateChange': self.onPlayerStateChange.bind(self),
                }
            });
        },

        onPlayerReady: function(event) {
            // Tell the player that the video has been loaded.
            this.containerPlayer.videoLoaded();

            // Mute the video if our options specify so.
            if (this.containerPlayer.options.muted) {
                event.target.mute();
            }
        },

        onPlayerStateChange: function(event) {
            // When the YouTube players state changes we 
            // relay the change events to our player.
            switch (event.data) {
                case YT.PlayerState.PLAYING:
                    this.containerPlayer.videoPlaying();
                break;
                case YT.PlayerState.PAUSED:
                    this.containerPlayer.videoPaused();
                break;
                case YT.PlayerState.ENDED:
                    this.containerPlayer.videoEnded();
                break;
            }
        },

        play: function() {
            // Shim to play the video.
            this.player.playVideo();
        },

        pause: function() {
            // Shim to pause the video.
            this.player.pauseVideo();
        },

        goTo: function(secs) {
            // Shim to goTo a specified position within the video.
            this.player.seekTo(secs);
        }
    });

    $.fn.ContainerPlayer = function(options) {

        return this.each(function() {
            var el = this;
            $(el).data("player.init", true);

            var player = Object.create(ContainerPlayer);
            player.init(el, options);
            $.data(el, "player", player);
        });

    };

})(jQuery, window, document);