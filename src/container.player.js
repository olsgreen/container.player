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
            loop: true,
            muted: true,
            ratio: 16 / 9,
            fitContainer: true,
            type: 'html5',
        },

        init: function(el, userOptions) {
            var self = this;

            self.$window = $(window);
            self.$container = $(el);
            self.options = $.extend(true, {}, self.defaults, userOptions);
            self.ID = parseInt(Math.random() * 1000000);
            self.holderID = 'ContainerPlayer-ID-' + self.ID;

            //self.setDimensions(self.$container);

            self.createContainerVideo();

            if ('youtube' === self.options.type) {
                self.YouTube = Object.create(YouTubeAdapter);
                self.YouTube.init(self);
                //console.log(self);
            } else {
                self.createHTML5Video();
            }

            // Listen for Resize Event
            self.$window.on('resize.ContainerPlayer' + self.ID, function() {
                self.resize();
            });

            //loadAPI(self.onYouTubeIframeAPIReady.bind(self));
            self.resize(self);

            return self;
        },

        setDimensions: function($container) {
            this.options.width = $container.width();
            this.options.height = $container.height();//Math.ceil(this.options.width / this.options.ratio);
        },

        createContainerVideo: function() {
            var self = this;

            /*jshint multistr: true */
            var $YTPlayerString = $('<div id="ytplayer-container' + self.ID + '" style="background-color: red;">\
                                        <div id="' + self.holderID + '" class="ytplayer-player-inline" style="background-color: yellow;"></div> \
                                        </div> \
                                        <div id="ytplayer-shield" class="ytplayer-shield"></div>');

            self.$container.append($YTPlayerString);
            $YTPlayerString = null;
        },

        createHTML5Video: function() {
            var $YTPlayerPlayer = $('#' + this.holderID),
            $video = $('<video></video>');
            $video.bind('loadeddata', function () {
                $video.get(0).play();
            });
            $YTPlayerPlayer.append($video);
            $video.prop('src', 'test/video.mp4');
        },

        resize: function() {
            var self = this;

            self.setDimensions(self.$container);

            var pWidth, // player width, to be defined
                pHeight, // player height, tbd
                $YTPlayerPlayer = $('#' + self.holderID);

                //console.log((self.options.width / self.options.ratio), self.options.height);

                //console.log(self.options.width, self.options.ratio, self.options.height);

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

            //console.log($YTPlayerPlayer.attr('style'));

            $YTPlayerPlayer = null;
        }
    },

    YouTubeAdapter = {
        defaults: {
            youTube: {
                videoId: 'M7lc1UVf-VE',
                playerVars: {
                    iv_load_policy: 3,
                    modestbranding: 1,
                    autoplay: 1,
                    controls: 0,
                    showinfo: 0,
                    wmode: 'opaque',
                    branding: 0,
                    autohide: 0
                }
            }
        },

        init: function(containerPlayer) {
            var self = this;

            if (typeof global.YouTube === "undefined") {
                global.YouTube = {
                    apiLoading: false,
                    onApiLoad: $.Deferred(),
                };
            }

            self.containerPlayer = containerPlayer;
            self.options = $.extend(true, {}, self.defaults, self.containerPlayer.options);

            self.whenApiLoaded(self.setupPlayer.bind(self));
        },

        loadAPI: function() {
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
        },

        whenApiLoaded: function(callback) {
            if (typeof YT === 'object')  {
                callback();
                return;
            } else if (typeof YT === 'undefined' && global.YouTube.apiLoading === false) {
                // Prevents Ready Event from being called twice
                global.YouTube.apiLoading = true;

                // Creates deferred so, other players know when to wait.
                window.onYouTubeIframeAPIReady = function() {
                    window.onYouTubeIframeAPIReady = null;
                    global.YouTube.onApiLoad.resolve();
                };

                this.loadAPI();
            }

            global.YouTube.onApiLoad.done(function() { callback(); });
        },

        setupPlayer: function() {
            var self = this;

            self.player = new YT.Player(self.containerPlayer.holderID, {
                videoId: self.options.youTube.videoId,
                playerVars: self.options.youTube.playerVars,
                events: {
                    'onReady': self.onPlayerReady,
                    //'onStateChange': onPlayerStateChange
                }
            });
        },

        onPlayerReady: function(event) {
            event.target.mute();
            event.target.playVideo();
        }
    };

    $.fn.ContainerPlayer = function(options) {

        return this.each(function() {
            var el = this;

            $(el).data("ctplayer-init", true);
            var player = Object.create(ContainerPlayer);
            player.init(el, options);
            $.data(el, "ctPlayer", player);
        });
        
    };

})(jQuery, window, document);