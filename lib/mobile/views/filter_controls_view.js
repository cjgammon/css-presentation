/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {

    function FilterControlsView(filterListView, filter) {
        FilterControlsView.$super.call(this, Global.ScrollView.HORIZONTAL);
        this.filter = filter;
        this.filterListView = filterListView;
        this.layoutIgnore = true;
        this.el.css({
            "position": "absolute",
            "-webkit-transform-origin": "0 0"
        });
        this.needsToFitInViewport = false;
        this.contentView.setLayout(new Global.HorizontalLayout());
        this.el.css({
            "width": "100%",
            "height": "150px"
        });
        this.on("afterresize", this.onAfterResize.bind(this));

        var self = this;
        this.controls = [];
        $.each(filter.config.params, function (name) {
            var filterParam = filter.config.config[name],
                type = filterParam.type || 'range';
            if (type == 'hidden' || type == "unknown")
                return;
            self.createControl(name, type, filterParam);
        });
        filter.on("filterSourceChanged", this.onFilterSourceChanged.bind(this));
        this.onFilterSourceChanged();

        this.visible = false;
    }
    Global.Utils.extend(FilterControlsView).from(Global.StepScrollView);

    $.extend(FilterControlsView.prototype, {
        createControl: function(name, type, filterParam) {
            var EditorClass = Global.Controls.get(type);
            if (!EditorClass)
                return;

            var controlView = new Global.View();
            controlView.el.css({
                "position": "absolute",
                "top": "0px",
                "height": "150px"
            });
            controlView.setLayout(new Global.VerticalLayout());

            var parameterView = new EditorClass();
            controlView.parameterView = parameterView;
            parameterView.name = name;
            parameterView.filterParam = filterParam;
            parameterView.field = filterParam.hasOwnProperty("field") ? filterParam.field : name;
            parameterView.on("valuechanged", this.onValueChanged.bind(this, parameterView));
            parameterView.el.css({
                "background": "-webkit-linear-gradient(bottom, rgba(255,255,255,0.5) 0%,rgba(255,255,255,0) 30%)"
            });
            parameterView.fillWidth = 1;
            parameterView.fillHeight = 1;
            parameterView.init();

            this.controls.push(parameterView);

            var labelView = new Global.View();
            labelView.fillWidth = 1;
            labelView.el.css({
                "width": "100%",
                "height": "40px",
                "text-align": "center",
                "padding": "10px",
                "background": "rgba(0, 0, 0, 0.7)",
                "color": "white"
            });
            labelView.el.append(name);

            controlView.append(parameterView);
            controlView.append(labelView);
            this.contentView.append(controlView);
        },

        onValueChanged: function(control) {
            if (!this.source)
                return;
            this.source[control.field] = control.getValue();
            this.filter.valuesUpdated(control.name);
        },

        onFilterSourceChanged: function() {
            this.source = this.filter.source;
            if (!this.source)
                return;
            var controls = this.controls;
            for (var i = 0; i < controls.length; ++i) {
                var control = controls[i];
                var value = this.source[control.field];
                control.setValue(value);
            }
        },

        updateTransform: function() {
            this.el.css({
                "-webkit-transform": "translate3d(0, " + (- this.innerHeight()) + "px, 0px)",
                "opacity": 1
            });
        },

        show: function() {
            if (this.visible)
                return;
            this.clearRemovalTimer();
            this.visible = true;
            this.el.css({
                "-webkit-transition": "-webkit-transform 0.2s linear, opacity 0.1s linear",
                "opacity": 0,
                "-webkit-transform": "translate3d(0px, 0px, 0px)"
            });
            this.relayout();
            var self = this;
            setTimeout(function() {
                self.updateTransform();
            }, 0);
        },

        clearRemovalTimer: function() {
            if (!this.removalTimer)
                return;
            clearTimeout(this.removalTimer);
            this.removalTimer = null;
        },

        destroy: function() {
            this.hide(true);
        },

        hide: function(destroy) {
            if (!this.visible)
                return;
            this.clearRemovalTimer();
            this.visible = false;
            this.css({
                "-webkit-transition": "-webkit-transform 0.3s linear, opacity 0.2s linear",
                "-webkit-transform": "translate3d(0px, 0px, 0px)",
                "opacity": 0
            });
            var self = this;
            if (destroy) {
                this.removalTimer = setTimeout(function() {
                        self.el.remove();
                }, 300);
            }
        },

        onAfterResize: function() {
            if (this.el.parent().length) {
                this.el.css("-webkit-transition", "none");
                this.updateTransform();
                this.relayout();
            }
        },

        relayout: function() {
            var width = this.width();
            this.contentView.forEachChild(function(childView){
                childView.css("width", width);
                childView.parameterView.css("width", width);
            });
            FilterControlsView.prototype.$super.relayout.call(this);
        }
    });

    Global.FilterControlsView = FilterControlsView;

})();