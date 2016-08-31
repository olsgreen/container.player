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

    // Global namespace.
    var global = window.ContainerPlayer = {};

    if (typeof Object.create !== "function") {
        Object.create = function(obj) {
            function F() {}
            F.prototype = obj;
            return new F();
        };
    }

    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

    var ContainerPlayer = {

        // Default options for the player.
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

            // Pipework
            self.$window = $(window);
            self.$container = $(el);
            self.options = $.extend(true, {}, self.defaults, userOptions);
            self.ID = parseInt(Math.random() * 1000000);
            self.outerID = 'containerPlayerOuter' + self.ID;
            self.innerID = 'containerPlayerInner' + self.ID;
            self.overlayID = 'containerPlayerOverlay' + self.ID;
            self.resizeEventID = 'resize.ContainerPlayer' + self.ID;

            // Create a container if the selected element is the <body>.
            if ('BODY' === el.tagName) {
                self.$container = $('<div class="container-player fullscreen-background"></div>');
                $(el).append(self.$container);
            }

            // Create the player DOM.
            self.createPlayerDOM();
 
            // Detect the adapter we are using.
            self.adapter = self.detectAdapter();

            // Boot the adapter.
            self.adapter.init(self);

            // Listen for the resize event.
            self.$window
                .on(self.resizeEventID, self.resize.bind(self))
                .trigger(self.resizeEventID);

            return self;
        },

        detectAdapter: function() {
            // YouTube
            if (typeof this.options.youTube === 'object') {
                this.$container.addClass('youtube');
                return Object.create(YouTubeAdapter);
            } 

            // Vimeo
            else if (typeof this.options.vimeo === 'object') {
                this.$container.addClass('vimeo');
                return Object.create(VimeoAdapter);
            }

            // HTML5
            else if (typeof this.options.html5 === 'object') {
                this.$container.addClass('html5');
                return Object.create(HTML5Adapter);
            } 

            // No configuration detected, error out.
            else {
                throw "Invalid options passed, no adapter configuration found.";
            }
        },

        createPlayerDOM: function() {
            var self = this;

            /*jshint multistr: true */
            self.player = {};
            self.player.$outer = $('<div id="' + self.outerID + '" class="container-player-outer"></div>');
            self.player.$inner = $('<div id="' + self.innerID + '" class="container-player-inner"></div>');

            if (self.options.overlay) {
                self.player.$overlay = $('<div id="' + self.overlayID + '" class="container-player-overlay"></div>');

                // Class name
                if (typeof self.options.overlay.class !== "undefined") {
                    self.player.$overlay.addClass(self.options.overlay.class);
                }

                // Opacity
                if (typeof self.options.overlay.opacity !== "undefined") {
                    self.player.$overlay.css('opacity', self.options.overlay.opacity);
                }

                // Color
                if (typeof self.options.overlay.color !== "undefined") {
                    self.player.$overlay.css('background-color', self.options.overlay.color);
                }

                // Background image
                if (typeof self.options.overlay.image !== "undefined") {
                    self.player.$overlay.css('background-image', 'url('+self.options.overlay.image+')');

                    // Background size
                    if (typeof self.options.overlay.backgroundSize !== "undefined") {
                        self.player.$overlay.css('background-size', 'url('+self.options.overlay.backgroundSize+')');
                    }

                    // Background repeat
                    if (typeof self.options.overlay.backgroundRepeat !== "undefined") {
                        self.player.$overlay.css('background-repeat', 'url('+self.options.overlay.backgroundRepeat+')');
                    }
                }

                self.$container.append(self.player.$overlay);
            }

            self.$container.append(
                self.player.$outer.append(self.player.$inner)
            );
        },

        resize: function() {
            var self = this,
                pWidth, // player width, to be defined
                pHeight; // player height, tbd;

            // Update the containers dimensions
            self.options.width = self.$container.width();
            self.options.height = self.$container.height();

            // Detect if the inner element has been replaced or removed.
            if (! $.contains(document, self.player.$inner[0])) {
                self.player.$inner = $('#' + self.innerID);
            }

            // Maintain the players height and width.
            if (self.options.forceAspect) {
                pHeight = (self.options.width / self.options.ratio).toFixed(3);
                self.$container.height(pHeight);

                self.player.$inner.css({
                    left: 0,
                    top: 0,
                    height: pHeight,
                    width: self.options.width,
                });

                return;
            }

            // player width is greater, offset left; reset top
            if (self.options.fitContainer && (self.options.width / self.options.ratio < self.options.height)) {
                pWidth = Math.ceil(self.options.height * self.options.ratio);
                self.player.$inner.width(pWidth).height(self.options.height).css({
                    left: (self.options.width - pWidth) / 2,
                    top: 0
                });
            }

            // player height is greater, offset top; reset left
            else {
                pHeight = Math.ceil(self.options.width / self.options.ratio); 
                self.player.$inner.width(self.options.width).height(pHeight).css({
                    left: 0,
                    top: (self.options.height - pHeight) / 2
                });
            }

        },

        /*
         | Add the various player state CSS classes 
         | and trigger their events on the element.
         */
        
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

        /*
         | Methods to allow manipulation of the videos 
         | state via the adapter shims.
         */

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

        // Default options for the adapter.
        defaults: {},

        init: function(containerPlayer) {
            throw "Not implemented";
        },

        /*
         | Shims to allow adapter player control 
         | from the base player.
         */

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

    HTML5Adapter = $.extend(Object.create(AbstactAdapter), {
        
        // Default options for the adapter.
        defaults: {
            sources: [
                // ['video/mp4', 'http://my-server.com/path/to/video.mp4']
                // ['video/webm', 'http://my-server.com/path/to/video.webm']
            ],
            props: {
                preload: 'auto', // none | metadata | auto
                crossorigin: null, // null | anonymous | use-credentials
            }
        },

        init: function(containerPlayer) {
            this.containerPlayer = containerPlayer;
            this.options = $.extend(true, {}, this.defaults, this.containerPlayer.options.html5);

            // If sources aren't defined but a single src options is set the videos src property.
            if (typeof this.options.src !== 'undefined' &&
                0 === this.options.sources.length) {
                this.options.props.src = this.options.src;
            }

            // Poster
            if (typeof this.options.poster !== "undefined") {
                this.containerPlayer.player.$outer.css('background-image', 'url('+this.options.poster+')');
                this.options.props.poster = this.options.poster;
            }

            // Autoplay
            if (typeof this.options.props.autoplay === "undefined") {
                this.options.props.autoplay = this.containerPlayer.options.autoplay;
            }

            // Loop
            if (typeof this.options.props.loop === "undefined") {
                this.options.props.loop = this.containerPlayer.options.loop;
            }

            // Controls
            if (typeof this.options.props.controls === "undefined") {
                this.options.props.controls = this.containerPlayer.options.controls;
            }

            // Muted
            if (typeof this.options.props.muted === "undefined") {
                this.options.props.muted = this.containerPlayer.options.muted;
            }

            this.createHTML5Video();
        },

        createHTML5Video: function() {
            // HTML5 video element
            this.$video = $("<video></video>")
                .html('Your browser doesn\'t support HTML5 video tag.')
                .on('canplay playing pause ended', this.onPlayerStateChange.bind(this));

            // Add the videos properties
            for (var name in this.options.props) {
                var value = this.options.props[name];
                if (value) {
                    this.$video.prop(name, value);
                }
            }

            // Add the videos sources
            for (var source in this.options.sources) {
                this.$video.append(
                    $('<source></source>')
                        .prop('src', this.options.sources[source][1])
                        .prop('type', this.options.sources[source][0])
                );
            }

            // Add the element to the container
            this.containerPlayer.player.$inner.append(this.$video);
        },

        onPlayerStateChange: function(event) {
            // When the HTML5 elements state changes we
            // relay the change events to our player.
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

        /*
         | Shims to allow adapter player control 
         | from the base player.
         */
        
        play: function() {
            this.$video[0].play();
        },

        pause: function() {
            this.$video[0].pause();
        },

        goTo: function(secs) {
            this.$video[0].currentTime = secs;
        }
    }),

    YouTubeAdapter = $.extend(Object.create(AbstactAdapter), {

        // Default options for the adapter.
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

                    // Loop the video
                    if (this.containerPlayer.options.loop) {
                        this.goTo(0);
                        this.play();
                    }
                break;
            }
        },

        /*
         | Shims to allow adapter player control 
         | from the base player.
         */

        play: function() {
            this.player.playVideo();
        },

        pause: function() {
            this.player.pauseVideo();
        },

        goTo: function(secs) {
            this.player.seekTo(secs);
        }
    });

    VimeoAdapter = $.extend(Object.create(AbstactAdapter), {

        // Default options for the adapter.
        defaults: {
            videoId: '',
            playerVars: {
                autopause: false,
                byline: false,
                color: '00adef',
                portrait: false,
                title: false
            }
        },

        init: function(containerPlayer) {
            var self = this;

            // Make a local reference to the player
            self.containerPlayer = containerPlayer;

            // Merge the default and user specified options.
            self.options = $.extend(
                true, {}, self.defaults, self.containerPlayer.options.vimeo
            );

            // Set the video id.
            self.options.playerVars.id = self.options.videoId;

            // Define the global Vimeo scope for API loading.
            if (typeof global.Vimeo === "undefined") {
                global.Vimeo = {
                    apiLoading: false,
                    onApiLoad: $.Deferred(),
                    apiCheckInterval: null,
                };
            }

            // Poster
            if (typeof self.options.poster !== "undefined") {
                self.containerPlayer.player.$outer.css('background-image', 'url('+self.options.poster+')');
            }

            // Autoplay
            if (typeof self.options.playerVars.autoplay === "undefined") {
                self.options.playerVars.autoplay = self.containerPlayer.options.autoplay;
            }

            // Controls
            if (typeof self.options.playerVars.controls === "undefined") {
                self.options.playerVars.background = self.containerPlayer.options.controls ? false : true;
            }

            // Loop
            if (typeof this.options.playerVars.loop === "undefined") {
                this.options.playerVars.loop = this.containerPlayer.options.loop;
            }

            self.whenApiIsReady(self.createPlayer.bind(this));

            self.loadApi();
        },

        whenApiIsReady: function(callback) {
            // Immediatly make the callback if the Vimeo API is loaded.
            if (typeof Vimeo === 'object')  {
                callback();
                return;
            }

            // Add the callback to the queue to be called once the API has loaded.
            global.Vimeo.onApiLoad.done(function() { callback(); });
        },

        loadApi: function() {
            if (typeof Vimeo === 'undefined' && global.Vimeo.apiLoading === false) {
                global.Vimeo.apiLoading = true;

                // Listen for the ready call from the YouTube API.
                global.Vimeo.apiCheckInterval = setInterval(function() {
                    if (typeof Vimeo !== 'undefined') {
                        clearInterval(global.Vimeo.apiCheckInterval);

                        // Resolve all of the callbacks that are currently
                        // waiting for the API to finish loading.
                        global.Vimeo.onApiLoad.resolve();
                    }
                }, 100);

                // Load API
                var tag = document.createElement('script'),
                head = document.getElementsByTagName('head')[0];

                if (window.location.origin == 'file://') {
                    tag.src = 'http://player.vimeo.com/api/player.js';
                } else {
                    tag.src = '//player.vimeo.com/api/player.js';
                }

                head.appendChild(tag);

                // Clean up Tags.
                head = null;
                tag = null;
            }
        },

        getVideoUrl: function() {
            var url, host, params;
            
            // Build the parameter string and replace 
            // string booleans with integers.
            params = $.param(this.options.playerVars)
                .replaceAll('false', '0')
                .replaceAll('true', '1');

            if (window.location.origin == 'file://') {
                host = 'http://player.vimeo.com/video/';
            } else {
                host = '//player.vimeo.com/video/';
            }

            return host+this.options.videoId+'?'+params;
        },

        createPlayer: function() {
            // Due to the Vimeo JS API not supporting their experimental background 
            // switch, we must build the iFrame manually and then attach their API.
            var $iframe = $('<iframe></iframe>').prop('src', this.getVideoUrl());

            // Attach the frame
            this.containerPlayer.player.$inner.append($iframe);

            // Boot the player
            this.player = new Vimeo.Player($iframe[0]);

            // Mute if needed
            if (this.containerPlayer.options.muted) {
                this.player.setVolume(0);
            }

            // Events
            this.player.on('play', this.containerPlayer.videoPlaying.bind(this.containerPlayer));
            this.player.on('pause', this.containerPlayer.videoPaused.bind(this.containerPlayer));
            this.player.on('ended', this.containerPlayer.videoEnded.bind(this.containerPlayer));
            this.player.on('loaded', this.containerPlayer.videoLoaded.bind(this.containerPlayer));

            $frame = null;
        },  

        /*
         | Shims to allow adapter player control 
         | from the base player.
         */

        play: function() {
            this.player.play();
        },

        pause: function() {
            this.player.pause();
        },

        goTo: function(secs) {
            this.player.setCurrentTime(secs);
        }
    });

    // Create the plugin.
    $.fn.ContainerPlayer = function(options) {
        return this.each(function() {
            var el = this, 
                player = Object.create(ContainerPlayer);

            // Boot the player class.
            player.init(el, options);

            // Expose the player via the elements data method.
            $.data(el, "player", player);
        });
    };

})(jQuery, window, document);