define(['core'], function(){

    (function($) {

        var _interval = 3;

        // 获取index对应的时间间隔, 单位: 秒
        function getInterval(index, intervalConfig){
            if($.isArray(intervalConfig)){
                return intervalConfig[index] ? intervalConfig[index] : intervalConfig[intervalConfig.length - 1];
            }
            return intervalConfig;
        }

        // 新增参数
        $.extend($.switchable.Config, {
            autoplay: false,
            // 切换间隔时间
            interval: 3,// 3秒
            // 鼠标悬停暂停切换
            pauseOnHover: true
        });


        /**
         * API:
         *
         * this.paused  =>  Boolean
         * this.play()  =>  Function
         * this.pause() =>  Function
         */
        $.switchable.Plugins.push({
            name: 'autoplay',

            init: function(host) {
                var cfg = host.config,
                    pausing = false,
                    timer1, timer2,
                    to;

                if ( !cfg.autoplay || host.length <= 1 ) {
                    return;
                }

                if ( cfg.pauseOnHover ) {
                    host.panels.add(host.triggers).hover(function() {
                        host._pause();
                    }, function() {
                        if ( !pausing ) {
                            host._play();
                        }
                    });
                }

                function run() {
                    to = host.willTo(host.isBackward);

                    if ( to === false ) {
                        host._cancelTimers();
                        return;
                    }
                    //获取下一个index播放的间隔
                    _interval = getInterval(to, cfg.interval);

                    host.switchTo(to, host.isBackward ? 'backward' : 'forward');
                }

                function autoRun() {
                    timer2 = setTimeout(function(){
                        run();
                        autoRun();
                    }, (_interval + cfg.duration) * 1000);
                }

                // 增加api
                $.extend(host, {
                    /**
                     * 启动
                     */
                    _play: function() {
                        host._cancelTimers();

                        // 让外部知道当前的状态
                        host.paused = false;

                        //获取当前index播放的间隔
                        _interval = getInterval(host.index, cfg.interval);

                        // 让首次(或者暂停后恢复)切换和后续的自动切换的间隔时间保持一致
                        timer1 = setTimeout(function(){
                            run();
                            autoRun();
                        }, _interval * 1000);
                    },

                    /**
                     * 暂停
                     */
                    _pause: function() {
                        host._cancelTimers();

                        host.paused = true;
                    },

                    /**
                     * 取消切换定时器
                     */
                    _cancelTimers: function() {
                        if ( timer1 ) {
                            clearTimeout(timer1);
                            timer1 = undefined;
                        }

                        if ( timer2 ) {
                            clearTimeout(timer2);
                            timer2 = undefined;
                        }
                    },

                    /**
                     * 对外api, 使外部可以在暂停后恢复切换
                     */
                    play: function() {
                        host._play();

                        pausing = false;

                        return host;
                    },

                    /**
                     * 对外api, 使外部可以停止自动切换
                     */
                    pause: function() {
                        host._pause();

                        pausing = true;

                        return host;
                    }

                });

                // start autoplay
                host._play();

            }
        });

    })(jQuery);
});

