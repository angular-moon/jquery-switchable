define(['jquery'], function(){
    (function($){

        $.switchable = {
            /**
             * 配置
             */
            Config: {
                // Boolean, String, jQuery
                triggers: true,

                // 使用何种方法把自动生成的 triggers 插入到DOM树中, 位置相对于 panels 的容器
                putTriggers: 'insertAfter', // 常用的还有: insertBefore 和 appendTo

                // triggers's wrap 的 className, 自动生成 triggers 时生效, 方便为 triggers 设置样式
                triggersWrapCls: 'switchable-triggers',

                // 当前 trigger 的 className
                currentTriggerCls: 'current',

                // Selector, jQuery
                panels: null,

                // 每次切换所包含的 panels 的数量
                steps: 1,

                // 触发类型
                triggerType: 'mouse', // or 'click'

                // 触发延迟, 单位: 秒
                delay: .1, // 100ms

                // 默认激活项
                initIndex: 0,

                // 效果
                effect: 'none',

                easing: 'ease',

                // 每次切换所花的时间, 单位: 秒
                duration: .5,

                // 循环
                loop: true,

                beforeSwitch: null,

                onSwitch: null,

                api: false
            },

            /**
             * 切换效果
             */
            Effects: {
                'none': function(from, to) {
                    var self = this,
                        cfg = self.config;

                    self.panels
                        .slice(from * cfg.steps, (from + 1) * cfg.steps).hide()
                        .end()
                        .slice(to * cfg.steps, (to + 1) * cfg.steps).show();

                }
            },

            /**
             * 插件
             */
            Plugins: []
        };


        /**
         * API:
         *
         * this.config      =>  Object
         * this.container   =>  jQuery
         * this.triggers    =>  jQuery
         * this.panels      =>  jQuery
         * this.length      =>  Number
         * this.index       =>  Number
         * this.willTo()    =>  Number, Boolean
         * this.switchTo()  =>  Function
         */
        function Switchable($container, cfg, selector){
            var self = this,
                $self = $(this),
                _beforeFn = 'beforeSwitch',
                _onFn = 'onSwitch';

            if ( $.isFunction(cfg[_beforeFn]) ) {
                $self.bind(_beforeFn, cfg[_beforeFn]);
            }
            if ( $.isFunction(cfg[_onFn]) ) {
                $self.bind(_onFn, cfg[_onFn]);
            }

            $.extend(self, {
                /**
                 * install plugins
                 */
                _initPlugins: function() {
                    var plugins = $.switchable.Plugins,
                        len = plugins.length,
                        i = 0;

                    for ( ; i < len; i++ ) {
                        if ( plugins[i].init ) {
                            plugins[i].init(self);
                        }
                    }
                },

                /**
                 * init Switchable
                 */
                _init: function() {
                    self.container = $container;
                    self.config = cfg;

                    // 获取 panels
                    if ( !!cfg.panels && (cfg.panels.jquery || $.type(cfg.panels) === 'string') ) {
                        self.panels = $container.find(cfg.panels);
                    } else {
                        self.panels = $container.children();
                    }

                    // panel-groups's length
                    self.length = Math.ceil(self.panels.length / cfg.steps);

                    // if no panel
                    if ( self.length < 1 ) {
                        window.console && console.warn('No panel in ' + selector);
                        return;
                    }

                    // 当前自然数索引
                    self.index = cfg.initIndex === null ? undefined : (cfg.initIndex + (cfg.initIndex < 0 ? self.length : 0));

                    // 不使用效果时直接显示, 否则由各 effect 自己初始化
                    if ( cfg.effect === 'none' ) {
                        self.panels.slice(self.index * cfg.steps, (self.index + 1) * cfg.steps).show();
                    }

                    // 获取 triggers 并绑定事件
                    if ( !!cfg.triggers ) {
                        var trigger, i, index;

                        if ( cfg.triggers.jquery ) {
                            self.triggers = cfg.triggers.slice(0, self.length);

                        } else {
                            // 自动生成 triggers 的 markup
                            var custom = $.type(cfg.triggers) === 'string',
                                arr = [];

                            for ( i = 1; i <= self.length; i++ ) {
                                arr.push('<li>' + (custom ? cfg.triggers : i) + '</li>');
                            }

                            self.triggers = $('<ul/>', {
                                'class': cfg.triggersWrapCls,
                                'html': arr.join('')
                            })[cfg.putTriggers]( $container ).find('li');
                        }

                        // 为激活项对应的 trigger 添加 currentTriggerCls
                        self.triggers.eq(self.index).addClass(cfg.currentTriggerCls);

                        // bind event
                        for ( i = 0; i < self.length; i++ ) {
                            trigger = self.triggers.eq(i);

                            trigger.click({ index: i }, function(e) {
                                index = e.data.index;

                                // 避免重复触发
                                if ( !self._triggerIsValid(index) ) {
                                    return;
                                }

                                self._cancelDelayTimer();
                                self.switchTo(index);
                            });

                            if ( cfg.triggerType === 'mouse' ) {
                                trigger.mouseenter({ index: i }, function(e) {
                                    index = e.data.index;

                                    // 避免重复触发
                                    if ( !self._triggerIsValid(index) ) {
                                        return;
                                    }

                                    self._delayTimer = setTimeout(function(){
                                        self.switchTo(index);
                                    }, cfg.delay * 1000);

                                }).mouseleave(function() {
                                    self._cancelDelayTimer();
                                });
                            }
                        }

                    }

                },

                /**
                 * is repeat?
                 */
                _triggerIsValid: function(to) {
                    return self.index !== to;
                },

                /**
                 * cancel delay timer
                 */
                _cancelDelayTimer: function() {
                    if ( self._delayTimer ) {
                        clearTimeout(self._delayTimer);
                        self._delayTimer = undefined;
                    }
                },

                /**
                 * switch a trigger
                 */
                _switchTrigger: function(from, to) {
                    self.triggers
                        .eq(from).removeClass(cfg.currentTriggerCls)
                        .end()
                        .eq(to).addClass(cfg.currentTriggerCls);
                },

                /**
                 * switch panels
                 */
                _switchPanels: function(from, to, direction) {
                    $.switchable.Effects[cfg.effect].call(self, from, to, direction);
                },

                /**
                 * get toIndex
                 */
                willTo: function(isBackward) {
                    if ( isBackward ) {
                        return self.index > 0 ? self.index - 1 : (cfg.loop ? self.length - 1 : false);
                    } else {
                        return self.index < self.length - 1 ? self.index + 1 : (cfg.loop ? 0 : false);
                    }
                },

                /**
                 * switch to
                 */
                switchTo: function(to, direction) {
                    // call beforeSwitch()
                    var event = $.Event(_beforeFn);
                    $self.trigger(event, [to]);
                    // 如果 beforeSwitch() return false 则阻止本次切换
                    if ( event.isDefaultPrevented() ) {
                        return;
                    }

                    // switch panels & triggers
                    self._switchPanels(self.index, to, direction);
                    if ( !!cfg.triggers ) {
                        self._switchTrigger(self.index, to);
                    }

                    // update index
                    self.index = to;

                    // call onSwitch()
                    event.type = _onFn;
                    $self.trigger(event, [to]);

                    return self;
                }
            });

            // 初始化并安装插件
            self._init();
            self._initPlugins();
        }


        $.fn.switchable = function(cfg) {
            var $self = $(this),
                len = $self.length,
                selector = $self.selector,
                el = [],
                i;

            cfg = $.extend({}, $.switchable.Config, cfg);
            // 将 effect 格式化为小写
            cfg.effect = cfg.effect.toLowerCase();

            for ( i = 0; i < len; i++ ) {
                el[i] = new Switchable($self.eq(i), cfg, selector + '[' + i + ']');
            }

            return cfg.api ? el[0] : $self;
        };

    })(jQuery);

    /* easing */
    (function($) {

        // css3 transition-timing-function
        $.switchable.TimingFn = {
            'ease': cubicBezier('.25, .1, .25, 1'),
            'linear': cubicBezier('0, 0, 1, 1'),
            'ease-in': cubicBezier('.42, 0, 1, 1'),
            'ease-out': cubicBezier('0, 0, .58, 1'),
            'ease-in-out': cubicBezier('.42, 0, .58, 1')/*,
             // jQuery Easing
             easeInQuad: cubicBezier('.55, .085, .68, .53'),
             easeOutQuad: cubicBezier('.25, .46, .45, .94'),
             easeInOutQuad: cubicBezier('.455, .03, .515, .955'),

             easeInCubic: cubicBezier('.55, .055, .675, .19'),
             easeOutCubic: cubicBezier('.215, .61, .355, 1'),
             easeInOutCubic: cubicBezier('.645, .045, .355, 1'),

             easeInQuart: cubicBezier('.895, .03, .685, .22'),
             easeOutQuart: cubicBezier('.165, .84, .44, 1'),
             easeInOutQuart: cubicBezier('.77, 0, .175, 1'),

             easeInQuint: cubicBezier('.755, .05, .855, .06'),
             easeOutQuint: cubicBezier('.23, 1, .32, 1'),
             easeInOutQuint: cubicBezier('.86, 0, .07, 1'),

             easeInSine: cubicBezier('.47, 0, .745, .715'),
             easeOutSine: cubicBezier('.39, .575, .565, 1'),
             easeInOutSine: cubicBezier('.445, .05, .55, .95'),

             easeInExpo: cubicBezier('.95, .05, .795, .035'),
             easeOutExpo: cubicBezier('.19, 1, .22, 1'),
             easeInOutExpo: cubicBezier('1, 0, 0, 1'),

             easeInCirc: cubicBezier('.6, .04, .98, .335'),
             easeOutCirc: cubicBezier('.075, .82, .165, 1'),
             easeInOutCirc: cubicBezier('.785, .135, .15, .86'),

             easeInElastic: null,
             easeOutElastic: null,
             easeInOutElastic: null,

             easeInBack: null,
             easeOutBack: null,
             easeInOutBack: null,

             easeInBounce: null,
             easeOutBounce: null,
             easeInOutBounce: null*/
        };


        $.switchable.Easing = function(param) {
            var name, len, i = 0;

            param = param.split(',');
            len = param.length;
            for ( ; i < len; i++ ) {
                param[i] = parseFloat(param[i]);
            }

            if ( len !== 4 ) {
                window.console && console.warn( cubicBezier(param.join(', ')) + ' missing argument.' );
            } else {
                name = 'cubic-bezier-' + param.join('-');

                if ( !$.easing[name] ) {
                    var lookup = makeLookup(function(p) {
                        return cubicBezierAtTime(p, param[0], param[1], param[2], param[3], 5.0);
                    });

                    $.easing[name] = function(p, n, firstNum, diff) {
                        return lookup.call(null, p);
                    };
                }
            }

            return name;
        }


        function cubicBezier(p) {
            return 'cubic-bezier(' + p + ')';
        }


        function makeLookup(fn) {
            var lookupTable = [],
                steps = 101,
                i;

            for ( i = 0; i <= steps; i++ ) {
                lookupTable[i] = fn.call(null, i/steps);
            }

            return function(p) {
                if ( p === 1 ) {
                    return lookupTable[steps];
                }

                var sp = steps*p,
                    p0 = Math.floor(sp),
                    y1 = lookupTable[p0],
                    y2 = lookupTable[p0+1];

                return y1+(y2-y1)*(sp-p0);
            }
        }


        // From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
        // 1:1 conversion to js from webkit source files
        // UnitBezier.h, WebCore_animation_AnimationBase.cpp
        function cubicBezierAtTime(t, p1x, p1y, p2x, p2y, duration) {
            var ax = bx = cx = ay = by = cy = 0;
            // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
            function sampleCurveX(t) {
                return ((ax*t+bx)*t+cx)*t;
            }
            function sampleCurveY(t) {
                return ((ay*t+by)*t+cy)*t;
            }
            function sampleCurveDerivativeX(t) {
                return (3.0*ax*t+2.0*bx)*t+cx;
            }
            // The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
            // animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
            function solveEpsilon(duration) {
                return 1.0/(200.0*duration);
            }
            function solve(x, epsilon) {
                return sampleCurveY(solveCurveX(x, epsilon));
            }
            // Given an x value, find a parametric value it came from.
            function solveCurveX(x, epsilon) {
                var t0, t1, t2, x2, d2, i;
                function fabs(n) {
                    if ( n >= 0 ) {
                        return n;
                    } else {
                        return 0-n;
                    }
                }
                // First try a few iterations of Newton's method -- normally very fast.
                for ( t2 = x, i = 0; i < 8; i++ ) {
                    x2 = sampleCurveX(t2)-x;
                    if ( fabs(x2) < epsilon ) {
                        return t2;
                    }
                    d2 = sampleCurveDerivativeX(t2);
                    if ( fabs(d2) < 1e-6 ) {
                        break;
                    }
                    t2 = t2-x2/d2;
                }
                // Fall back to the bisection method for reliability.
                t0 = 0.0;
                t1 = 1.0;
                t2 = x;
                if ( t2 < t0 ) {
                    return t0;
                }
                if ( t2 > t1 ) {
                    return t1;
                }
                while ( t0 < t1 ) {
                    x2 = sampleCurveX(t2);
                    if ( fabs(x2-x) < epsilon ) {
                        return t2;
                    }
                    if ( x > x2 ) {
                        t0 = t2;
                    } else {
                        t1 = t2;
                    }
                    t2 = (t1-t0)*0.5+t0;
                }
                return t2; // Failure.
            }
            // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
            cx = 3.0*p1x;
            bx = 3.0*(p2x-p1x)-cx;
            ax = 1.0-cx-bx;
            cy = 3.0*p1y;
            by = 3.0*(p2y-p1y)-cy;
            ay = 1.0-cy-by;
            // Convert from input time to parametric value in curve, then from that to output time.
            return solve(t, solveEpsilon(duration));
        }
    })(jQuery);
    /* anim */
    (function($){

        /*
         * params[:tp]  即: transition-property, defaults to 'all'
         */
        $.switchable.Anim = function($el, props, duration, easing, callback, tp) {
            var self = this,
                transition = {},
                css3,
                timer;

            // 检测浏览器是否支持CSS3 Transition, 并缓存结果
            if ( $.switchable.Transition === undefined ) {
                $.switchable.Transition = supportTransition();
            }
            css3 = $.switchable.Transition;

            $.extend(self, {
                isAnimated: false,

                run: function() {
                    // already started
                    if ( self.isAnimated ) {
                        return;
                    }

                    duration = duration * 1000;

                    if ( css3 ) {
                        transition[css3 + 'Property'] = tp || 'all';
                        transition[css3 + 'Duration'] = duration + 'ms';
                        transition[css3 + 'TimingFunction'] = easing;

                        $el.css( $.extend(props, transition) );

                        // 动画结束后执行回调
                        timer = setTimeout(function(){
                            // 清除 css3 transition
                            self._clearCss();

                            self._complete();
                        }, duration);

                    } else {
                        var regex = /cubic-bezier\(([\s\d.,]+)\)/,
                            cbMatch = easing.match(regex),
                            timingFn = $.switchable.TimingFn[easing];

                        // 处理 easing
                        if ( timingFn || cbMatch ) {
                            easing = $.switchable.Easing(cbMatch ? cbMatch[1] : timingFn.match(regex)[1]);
                        }

                        $el.animate(props, duration, easing, function(){
                            self._complete();
                        });
                    }

                    self.isAnimated = true;

                    return self;
                },

                /*
                 * params[:gotoEnd]  A Boolean indicating whether to complete the current animation immediately. Defaults to false.
                 */
                stop: function(gotoEnd) {
                    // already stopped
                    if ( !self.isAnimated ) {
                        return;
                    }

                    if ( css3 ) {
                        // 阻止回调执行
                        clearTimeout(timer);
                        timer = undefined;
                    } else {
                        // stop jQuery animation
                        $el.stop(false, gotoEnd);
                    }

                    self.isAnimated = false;

                    return self;
                },

                _complete: function() {
                    callback && callback();
                },

                _clearCss: function() {
                    transition[css3 + 'Property'] = 'none';
                    // transition[css3 + 'Duration'] = '';
                    // transition[css3 + 'TimingFunction'] = '';
                    $el.css(transition);
                }

            });
        }

        // 检测客户端是否支持CSS3 Transition
        function supportTransition() {
            var el = document.documentElement,
                prefix = ['Webkit', 'Moz'/*, 'O'*/],
                name = 'transition',
                support = '',
                i;

            if ( el.style[name] !== undefined ) {
                support = name;
            } else {
                for ( i = 0; i < 2; i++ ) {
                    if ( el.style[(name = prefix[i] + 'Transition')] !== undefined ) {
                        support = name;
                        break;
                    }
                }
            }

            return support;
        }

    })(jQuery);
});

