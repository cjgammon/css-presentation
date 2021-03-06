/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
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

    function ExpandableView() {
        ExpandableView.$super.call(this);
        this.el.addClass("expandable-view");
        this.open = false;
        this.titleView.on("tap", this.onTitleTap.bind(this));
        this.titleView.el.addClass("label-view");
    }
    Global.Utils.extend(ExpandableView).from(Global.View);

    $.extend(ExpandableView.prototype, {
        onTitleTap: function() {
            this.toggle();
        },

        toggle: function() {
            this.open = !this.open;
            this.update();
            this.relayoutParent();
        },

        update: function() {
            this.el.toggleClass("open", this.open);
            this.el.css("height", this.open ? "" : this.titleView.height());
        },

        internalRelayout: function() {
            ExpandableView.prototype.$super.internalRelayout.call(this);
            this.update();
        }

    });

    Global.ExpandableView = ExpandableView;

})();
