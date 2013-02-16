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
    function SlidesListView(slides) {
        SlidesListView.$super.call(this);
        this.el.addClass("slides-list-view");

        this.scrollView = new Global.StepScrollView(Global.ScrollView.HORIZONTAL);
        this.scrollView.fillParent();
        this.scrollView.maxScrollCount = 1;
        this.scrollView.contentView.setLayout(new Global.HorizontalLayout());
        this.append(this.scrollView);

        var self = this;
        slides.each(function(i, child) {
            self.scrollView.contentView.append(new Global.TemplateView.convert($(child).clone()));
        });
    }
    Global.Utils.extend(SlidesListView).from(Global.View);

    $.extend(SlidesListView.prototype, {
        internalRelayout: function() {
            var width = this.mainView().width(),
                height = this.mainView().height();
            this.scrollView.contentView.forEachChild(function(slideView) {
                slideView.css("width", width)
                         .css("height", height);
            });
            SlidesListView.prototype.$super.internalRelayout.call(this);
        }
    });

    Global.SlidesListView = SlidesListView;

})();