/*
 Copyright 2013 Roy Russo

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Latest Builds: https://github.com/royrusso/elasticsearch-HQ
 */

var DocumentListView = Backbone.View.extend({
    currentPage:1,
    maxPages:0,
    pageFrom:0, // defines the offset from the first result you want to fetch
    pageSize:0,
    columnArray:undefined,
    resultsModel:undefined,
    requestBody:undefined,
    resultBody:undefined,
    sortColumns:'_id',
    render:function () {
        this.pageSize = this.model.get('queryObj').size;
        var _this = this;

        var requestBodyObject = QueryUtil.buildBody(this.model, this.pageFrom);

        var searchRequest = $.ajax({
            url:this.model.getInstanceURL(),
            type:"POST",
            data:JSON.stringify(requestBodyObject)
        });

        searchRequest.success(function (data, textStatus, jqXHR) {
            var queryResultsModel = new QueryResultsListModel();
            queryResultsModel.responseTime = data.took;
            queryResultsModel.timeOut = data.timed_out;

            _this.resultBody = JSON.stringify(data);

            if (data.hits && data.hits.hits.length > 0) {

                // Columns...
                _this.columnArray = [
                    {key:"_index", name:"Index"},
                    {key:"_type", name:"Type"},
                    {key:"_score", name:"Score"},
                    {key:"_id", name:"ID"}
                ];
                // add columns for type data
                var sourceKeys = _.keys(data.hits.hits[0]._source);
                _.each(sourceKeys, function (item) {
                    _this.columnArray.push({key:item, name:uppercaseFirst(item), type:"source" }); // columns for
                });

                // Results...
                queryResultsModel.totalHits = data.hits.total;
                queryResultsModel.maxScore = data.hits.max_score;

                // loop results..
                // 1/ move _source items to root of the result tree for easier looping in the ui.
                // 2/ create JSON representation of the _source object.
                queryResultsModel.results = [];
                _.each(data.hits.hits, function (item) {
                    var result = {};
                    result = item;
                    result._raw = JSON.stringify(item);

                    jQuery.extend(result, item._source); // merge _source items in to root level of object.

                    result._source = undefined; // dont need this object nested in here.

                    queryResultsModel.results.push(result);
                });
                _this.resultsModel = queryResultsModel;

                // calc max pages
                if (_this.maxPages == 0) // only do this once
                {
                    _this.maxPages = Math.floor(((queryResultsModel.totalHits - 1) / _this.pageSize) + 1);
                }
            }
            else {
                queryResultsModel.totalHits = 0;
                queryResultsModel.maxScore = 0;
                _this.resultsModel = queryResultsModel;
            }
        });

        searchRequest.error(function (jqXHR, textStatus, errorThrown) {
        });

        searchRequest.complete(function () {
            var tpl = _.template(queryTemplate.results);
            $('#searchResults').html(tpl({
                columns:_this.columnArray,
                requestBody:_this.requestBody,
                results:_this.resultsModel,
                resultBody:_this.resultBody,
                currentPage:_this.currentPage,
                pageSize:_this.pageSize,
                maxPages:_this.maxPages
            }));

            $("[rel=tipRight]").tooltip();

            _this.calcPager();

            /*
             .bind("sortEnd", function(event) {
             var table = event.target,
             currentSort = table.config.sortList,
             // target the first sorted column
             columnNum = currentSort[0][0],
             columnName = $(table.config.headerList[columnNum]).text();

             console.log(columnName);

             });
             */


            return this;
        });
    },
    pageNext:function () {
        this.pageFrom = this.pageFrom + this.pageSize;
        this.currentPage++;
    },
    pagePrev:function () {
        if (this.pageFrom != 0) {
            this.pageFrom = this.pageFrom - this.pageSize;
            this.currentPage--;
        }
    },
    calcPager:function () {
        var _this = this;
        // pagination bindings don't seem to work on using backbone event binding, so ...
        $("#loadNext").click(function () {
            _this.pageNext();
            _this.render();
        });
        $("#loadPrev").click(function () {
            _this.pagePrev();
            _this.render();
        });
        $("#loadNextBtm").click(function () {
            _this.pageNext();
            _this.render();
        });
        $("#loadPrevBtm").click(function () {
            _this.pagePrev();
            _this.render();
        });
    }
});