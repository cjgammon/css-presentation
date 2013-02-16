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
    function Presenter(app) {
        Presenter.$super.call(this);
        this.app = app;
        this.initSlides();

        this.slidesListView = new Global.SlidesListView(this.slides);
        app.mainView.append(this.slidesListView);
    }
    Global.Utils.extend(Presenter).from(Global.EventDispatcher);

    $.extend(Presenter.prototype, {
        initSlides: function() {
            var slides = $("#slides");
            this.slides = slides.children().detach();
            slides.remove();
        }
    });

    Global.Presenter = Presenter;
    Global.Application.plugins.push(function(app) {
        app.presenter = new Presenter(app);
    });

})();