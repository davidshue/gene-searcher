var ClinVitae = {}

// -----------------------------------------------
// search functions and events - needs refactoring
// -----------------------------------------------

var deleteKey = 0;

ClinVitae.Search = {
    init: function() {
        $('#btn-search').on('click', function(){
            if ($('#main-search').val().length > 0){
                ClinVitae.Search.update();
                return false;
            }
        });
        $('#main-search').keyup(function(event) {
            if (event.which == 13) {
                if ($('#main-search').val().length > 0){
                    ClinVitae.Search.update();
                    return false;
                }
            }
        });
        $('#search-options').find('input:checkbox').on('change', function(){
            ClinVitae.Search.redrawDatatable();
        });
        // jQuery UI autocomplete
		var cache = {};
		$( "#main-search" ).autocomplete({
			minLength: 2,
			source: function( request, response ) {
				var q = request.term;
				if ( q in cache ) {
					response( cache[ q ] );
					return;
				}
				$.getJSON( '/api/v1/suggest', { genes: request.term }, function( data, status, xhr ) {
					cache[ q ] = data;
					response( data );
				});
			}
		});
        var showing_text = $('#search-results-table_info').html();
        $(document).on('scroll',function(){
            $('#main-search').autocomplete('close');
            if (showing_text != $('#search-results-table_info').html()){
                $('#search-results-table_info').addClass('highlight');
                showing_text = $('#search-results-table_info').html();
                setTimeout(function() {$('#search-results-table_info').removeClass('highlight')}, 200);
            }
        });
    },
    focus: function(obj) {
        if('placeholder' in document.createElement('input')){
            $(obj).focus();
            var val = $(obj).val();
            $(obj).val('');
            $(obj).val(val);
        }
    },
    newSearchString: function() {
        var q = encodeURIComponent($('#main-search').val());
        var f = ($('.dataTables_filter input').length > 0) ? encodeURIComponent($('.dataTables_filter input').val()) : '';
        var source = $('#cb_sources').find('input:checked').map(function() {return this.value;}).get().sort().join();
        var classification = $('#cb_classifications').find('input:checked').map(function() {return this.value;}).get().sort().join();
        var url = 'q=' + q + '&f=' + f + '&source=' + source + '&classification=' + classification;
        return url;
    },
    update: function(params) {
        ClinVitae.Spinner.init();

        if (params){
            $('#cb_sources').find('input:checkbox').removeAttr('checked');
            $('#cb_classifications').find('input:checkbox').removeAttr('checked');

            $('#main-search').val(decodeURIComponent(params['q']));

            $.each(params['source'].split(','), function(key, name) {
                $('#cb_sources').find('input:checkbox[value='+name+']').attr("checked", true);
            });

            $.each(params['classification'].split(','), function(key, name) {
                $('#cb_classifications').find('input:checkbox[value='+name+']').attr("checked", true);
            });
        }
        else{
            // cleanup page
            $('svg').remove();
            ClinVitae.Modal.close();
            ClinVitae.SearchOptions.close();
            $('#main-search').autocomplete('close');
            $('#search-page').removeClass('default').removeClass('alternate-image');
        }

        var url = '/api/v1/variants?' + ClinVitae.Search.newSearchString();
        var data = $('#main-search').val();

        ClinVitae.Tracking.search();
        $.getJSON( url, data, function( data, status, xhr ) {
            ClinVitae.Search.display(data, params);
        });
    },
    display: function(data, params) {

        if (data.length > 0){

            $('#no-search-results-text').hide();
            $('#main-search').hide();
            $('#btn-search').hide();

            $('#btn-options').show();
            $('#download-results').show();
            $('#search-results-content').show();

            var gene = '';

            var aaData=[];
            $.each(data, function(index, object) {

                gene = object.Gene;

                // nucleotide position expand collapse
                var nucleotideChangesHTML = '';
                var cssClass = '';

                nucleotideChangesHTML = '<div class="nucleotides">' + object['Nucleotide Change'] + '</div>';


                // add information icon for Invitae variants with submitterComment
                var variantInfo = '';
                if ((object.submitterComment!=undefined) & (object.Source=='Invitae')) {
                    var submitterCommentEncoded = fixedEncodeURIComponent(object.submitterComment);
                    variantInfo = '<div class="more-info" title="Click to see additional information" ' +
                    'onclick="ClinVitae.Variant.open(\''+object.Gene+'\',\''+object['Nucleotide Change']+'\',\''+object['Protein Change']+'\',\''+submitterCommentEncoded+'\');"><span class="icon-more-info">i</span></div>';
                }

                // if url available
                var source = ((object.URL!=undefined)) ? '<a href="'+object.URL+'" title="'+object.URL+
							'" target="_blank" data-tracking="Outbound Result" data-label="'+object.Source+
							'" onclick="ClinVitae.Tracking.outbound($(this));return false;">'
                                +object.Source+'</a>' : object.Source;

                // table data content
                aaData.push([ object.Gene || '', nucleotideChangesHTML, object['Protein Change'] || '', object.Alias || '',
                        object.Region || '', object['Reported Classification'] + variantInfo  || '', object['Last Evaluated'] || '', object['Last Updated'] || '',
                        source, object.Source ]);

            });

            // render datatable
            var oTable = $('#search-results-table').dataTable( {
                "bDestroy": true,
                "bFilter": true,
                "bPaginate": true,
                "oLanguage": {
                    "sSearch": "",
                    "sInfo": "_TOTAL_ results",
                    "sInfoFiltered": "",
                    "sInfoEmpty": "No results",
                    "sEmptyTable": "",
                    "sZeroRecords": "No results"
                },
                "iDisplayLength": 50,
                "aLengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
                "bAutoWidth": true,
                "bScrollInfinite": true,
                "bScrollCollapse": true,
                "sScrollY": ClinVitae.Search.calcDataTableHeight(),
                "aaSorting": [[ 1, "asc" ]],
                "aaData": aaData,
                "aoColumns": [
                    { "sTitle": "Gene" },
                    { "sTitle": "Nucleotide Change", "sType": "nucleotide-change" },
                    { "sTitle": "Protein Change" },
                    { "sTitle": "Alias" },
                    { "sTitle": "Region" },
                    { "sTitle": "Reported Classification" },
                    { "sTitle": "Last Evaluated" },
                    { "sTitle": "Last Updated" },
                    { "sTitle": "Source", "bVisible": false }
                ]
            } ).bind("filter", function() { ClinVitae.Search.filterEvent(); });
            oTable;

            $(window).resize(function() {
                ClinVitae.Search.adjustScrollHeight();
            });

            $('#btn-download').bind('click', function(){ClinVitae.Search.exportTSV();return false;});
            $('#btn-download').bind('mouseover', function(){$('#btn-download').attr('title',
                'Export ' + $('#search-results-table').dataTable()._('tr', {"filter":"applied"}).length + ' results to TSV')});

            $('#search-box').append('<div id="search-keyword" onclick="ClinVitae.Search.removeTag();return false;">' + gene +
                '<button id="btn-keyword" type="button"></button></div>');

            $('.dataTables_filter input').css('padding-left',$('#search-keyword').outerWidth() + 12);


            if (gene.toUpperCase() != $('#main-search').val().toUpperCase() )
            {
                $('.dataTables_filter input').val($('#main-search').val());
                $('#main-search').val(gene);
                oTable.fnFilter($('.dataTables_filter input').val());
            }
            else{
                if(params){
                    var filterParam = decodeURIComponent(params['f']);
                    $('.dataTables_filter input').val(filterParam);
                    oTable.fnFilter($('.dataTables_filter input').val());
                }
            }

            ClinVitae.Search.focus($('.dataTables_filter input'));
            $('.dataTables_filter input').attr("placeholder", "Refine results");
            $('.dataTables_filter input').attr("autocomplete", "off");

            $('.dataTables_filter input').keyup(function(event) {
                if ((event.which == 8) && ($('.dataTables_filter input').val().length == 0) && ($('#search-keyword').length > 0)){
                    deleteKey++;
                    if ((deleteKey > 2)){
                        ClinVitae.Search.removeTag();
                        return false;
                    }
                }
                else{
                    deleteKey = 0;
                }
            });
        }
        else{
            $('#search-results-content').hide();
            $('#no-search-results-text').show();
            $('#download-results').hide();

            $('#main-search').show();
            $('#btn-search').show();
            $('#btn-options').hide();
            ClinVitae.Search.focus($('#main-search'));
        }

        ClinVitae.Search.locationHashChangeUnbind();
        var hash = '#' + ClinVitae.Search.newSearchString();
        window.location.hash = hash;
        ClinVitae.Search.locationHashChange();

        setTimeout(function() {ClinVitae.Spinner.stop();}, 50);
    },
    exportTSV: function(){

        var oTable = $('#search-results-table').dataTable();
        var filteredRows = oTable._('tr', {"filter":"applied"});
        var totalRows = oTable.fnSettings().fnRecordsTotal();
        var trackingInfo = '';

        if (filteredRows.length < totalRows){
            trackingInfo = $('#main-search').val() + ' > ' + $('.dataTables_filter input').val();

            var filteredRowIds = [];
            $.each(filteredRows, function(index, object) {
                filteredRowIds.push([ object[11] ]);
            });

            var data = filteredRowIds.join(',').toString();
            var url = '/api/v1/variants';

            var form = $('<form id="filtered-export-form" method="POST" action="' + url + '">');
            form.append($('<input type="hidden" name="filteredIds" value="' + data + '">'));
            $('body').append(form);
            form.submit();
            $('#filtered-export-form').remove();
        }
        else{
            trackingInfo = $('#main-search').val();

            window.location.href = '/api/v1/variants?' + ClinVitae.Search.newSearchString() + '&format=tsv';
        }

        ClinVitae.Tracking.exportTSV(trackingInfo);
        return false;
    },
    removeTag: function(){
        var oTable = $('#search-results-table').dataTable();
        oTable.fnClearTable();

        $('#search-keyword').remove();

        $('#no-search-results-text').hide();
        $('#search-results-content').hide();
        $('#download-results').hide();
        $('#btn-options').hide();

        $('#main-search').show();
        $('#btn-search').show();
        $('#main-search').val('');
        ClinVitae.Search.focus($('#main-search'));
    },
    filterEvent: function(){
        var oTable = $('#search-results-table').dataTable();
        var filteredRows = oTable._('tr', {"filter":"applied"});

        if (filteredRows.length > 0){
            $('#download-results').show();
        } else {
            $('#download-results').hide();
        }

        var hash = '#' + ClinVitae.Search.newSearchString();
        window.location.hash = hash;

        //ClinVitae.Search.locationHashChangeUnbind();
        //var hash = '#' + ClinVitae.Search.newSearchString();
        //window.location.hash = hash;
        //ClinVitae.Search.locationHashChange();

    },
    calcDataTableHeight: function() {
        return Math.round($(window).height() - 219);
    },
    adjustScrollHeight: function() {
        var oTable = $('#search-results-table').dataTable();oTable.fnSettings().fnRecordsDisplay()
        var oSettings = oTable.fnSettings();
        oSettings.oScroll.sY = ClinVitae.Search.calcDataTableHeight();
        $('.dataTables_scrollBody').css('height', ClinVitae.Search.calcDataTableHeight());
        oTable.fnAdjustColumnSizing();
    },
    redrawDatatable: function() {
        var oTable = $('#search-results-table').dataTable();
        oTable.fnDraw(true);
    },
    customSortNucleotideChanges: function() {
        jQuery.extend( jQuery.fn.dataTableExt.oSort, {
            "nucleotide-change-pre": function ( a ) {
                var nc = a.match( /(:c\.|:g\.)(\*[0-9]+|\-[0-9]+|[0-9]+)(_|\-|\+|[a-zA-Z])/ );
                nc = (nc) ? nc[2].replace( /\*\-\./g, "" ) : 0;
                return parseFloat( nc );
            },
            "nucleotide-change-asc": function ( a, b ) {
                return a - b;
            },
            "nucleotide-change-desc": function ( a, b ) {
                return b - a;
            }
        });
    },
    expand: function(obj) {
        if ($(obj).closest('.nucleotides').hasClass('active')){
            $(obj).closest('.nucleotides').find('div').slideUp("fast",function(){
                ClinVitae.Search.adjustScrollHeight();
            });
            $(obj).closest('.nucleotides').removeClass('active');
        }
        else{
            $(obj).closest('.nucleotides').find('div').slideDown("fast",function(){
                ClinVitae.Search.adjustScrollHeight();
            });
            $(obj).closest('.nucleotides').addClass('active');
        }
        return false;
    },
    customCheckboxFilter: function(){

        $.fn.dataTableExt.afnFiltering.push(
            function( oSettings, aData, iDataIndex ) {

                var source = aData[9];
                var classification = aData[10];

                var sourceFound = false;
                var classificationFound = false;

                var sourceFilters = $('#cb_sources').find('input:checked').map(function() {return this.value;}).get();
                var classificationFilters = $('#cb_classifications').find('input:checked').map(function() {return this.value;}).get();

                $.each(sourceFilters, function(key, name) {
                    if (source == name){
                        sourceFound = true;
                    }
                });

                $.each(classificationFilters, function(key, name) {
                    if (classification == name){
                        classificationFound = true;
                    }
                });

                return (sourceFound && classificationFound);
            }
        );
    },
    locationHashChange: function() {
        if ("onhashchange" in window) {
 //           console.log('locationHashChange');
            $(window).bind('hashchange',ClinVitae.Search.loadFromHash);
        }
    },
    locationHashChangeUnbind: function() {
        if ("onhashchange" in window) {
 //           console.log('locationHashChangeUnbind');
            $(window).unbind('hashchange',ClinVitae.Search.loadFromHash);
        }
    },
    loadFromHash: function() {

//        console.log('loadFromHash');

// TODO - fix refresh bug
        return true;

        var params = {};
        var ps = window.location.hash.split(/#|&/);
        for (var i = 0; i < ps.length; i++) {
            if (ps[i]) {
                var p = ps[i].split(/=/);
                params[p[0]] = p[1];
            }
        }
        if (params['q'] && params['source'] && params['classification']){
            ClinVitae.Search.update(params);
        }
        else{
            window.location.href = '/';
        }
    }
}

// --------------------------------------------
// d3 visualization "sunburst" for default page
// --------------------------------------------
ClinVitae.D3 = {
    init: function() {
        var nodeStart;
        var nodeEnd;

        var width = 450,
            height = 475,
            radius = Math.min(width, height) / 2;

        var x = d3.scale.linear()
            .range([0, 2 * Math.PI]);

        var y = d3.scale.linear()
            .range([0, radius]);

        //var color = d3.scale.ordinal().range(["#2a3370", "#204786", "#1a5e98", "#1a7db0", "#1a989e",
        //   "#11ae96", "#5bbd71", "#a3ce51", "#fcb315"]);

        var svg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

        var partition = d3.layout.partition()
            .sort(null)
            .value(function(d) { return d.size; });

        var arc = d3.svg.arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
            .innerRadius(function(d) { return Math.max(0, y(d.y)); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

        d3.json("/data/d3-data-1.1.9.json", function(error, root) {
            var g = svg.selectAll("g")
                .data(partition.nodes(root))
                .enter().append("g");

            var path = g.append("path")
                .attr("d", arc)
                .attr("fill-opacity", .8)
                .style("stroke", "#fff")
                .attr("display", function(d) {
                    if (d.name == 'ARUP'){ nodeStart = d};
                    if (d.name == 'ClinVitae'){ nodeEnd = d};
                    return d.depth ? null : "none";
                }) // hide inner ring
                .style("fill", function(d) {
                    return d.color;
                    //return color((d.children ? d : d.parent).name);
                });
                 //.on("click", click);

            var text = g.append("text")
                .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
                .attr("transform", function(d) { return "rotate(" + computeTextRotation(d) + ")"; })
                .attr("x", function(d) { return y(d.y); })
                .attr("dx", "7") // margin
                .attr("dy", ".35em") // vertical-align
                .attr("fill-opacity", .6)
                .text(function(d) {
                    return (d.size > 198) ? d.name : '';
                    //return d.name;
                });

            //function click(d) {
            function refresh(d) {
              text.transition().attr("opacity", 0);
              path.transition()
                .duration(750)
                .attrTween("d", arcTween(d))
                .each("end", function(e, i) {
                    // check if the animated element's data e lies within the visible angle span given in d
                    if (e.x >= d.x && e.x < (d.x + d.dx)) {
                      // get a selection of the associated text element
                      var arcText = d3.select(this.parentNode).select("text");
                      // fade in the text element and recalculate positions
                      arcText.transition().duration(100)
                        .attr("opacity", 1)
                        .attr("transform", function() { return "rotate(" + computeTextRotation(e) + ")" })
                        .attr("x", function(d) { return y(d.y); });
                    }
                });
            };

            text.transition().attr("opacity", 0);
            path.transition().duration(0).attrTween("d", arcTween(nodeStart));
            setTimeout(function(){refresh(nodeEnd);}, 50);
        });
        d3.select(self.frameElement).style("height", height + "px");

        function arcTween(d) {
          var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
              yd = d3.interpolate(y.domain(), [d.y, 1]),
              yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
          return function(d, i) {
            return i
                ? function(t) { return arc(d); }
                : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
          };
        }

        function computeTextRotation(d) {
          return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
        }
    }
}

// ----------------------------------------
// simple modal for About ClinVitae content
// ----------------------------------------
ClinVitae.About = {
    init: function() {
        $('#btn-about').click(function() {
            ClinVitae.Modal.init('details','About <span class="logo-clinvitae-modal"></span>','','Close','');
            return false;
        });
        $('#modal-screen').on('click', function(){
            ClinVitae.Modal.close();
            return false;
        });
    }
}

ClinVitae.Modal = {
    init: function(styleClass,title,content,primaryButton,primaryButtonClass,clickPrimary) {
        var onClickPrimary = clickPrimary;

        // close variant description
        ClinVitae.Variant.close();

        $('#modal-button-primary').unbind();
        if (!clickPrimary) {
            onClickPrimary = function() {
                ClinVitae.Modal.close();
                return false;
            }
        }

        $("#modal-screen").hide();
        $("#modal").hide();

        $('#modal-screen').removeClass().addClass(styleClass);
        $('#modal').removeClass().addClass(styleClass);

        if(title.length > 0){
            $('#modal-title').html(title);
        }
        if(content.length > 0){
            $('#modal-content').html(content);
        }
        if(primaryButton.length > 0){
            $('#modal-button-primary').show().find('.button-label').html(primaryButton);
        }
        if(primaryButtonClass.length > 0){
            $('#modal-button-primary').removeClass().addClass(primaryButtonClass);
        }

        $('#modal-button-primary').on('click', onClickPrimary);

        $('#btn-close-modal').on('click', function(){
            ClinVitae.Modal.close();
            return false;
        });

        $('#modal-screen').show();
        $('#modal').show();
    },
    close: function() {
        $('#modal-screen').hide();
        $('#modal').hide();
    }
}

// -------------------------------
// simple modal for variant detail
// -------------------------------
ClinVitae.Variant = {
    init: function() {
        $('.btn-small-submit, .btn-close-variant, #variant-screen').on('click', function(){
            ClinVitae.Variant.close();
            return false;
        });
//        $('#variant-nucleotide-change').on('click', function() {
//            $('#search-results-table').dataTable().fnFilter($('#variant-nucleotide-change').text());
//            // update url
//            ClinVitae.Search.locationHashChangeUnbind();
//            var hash = '#' + ClinVitae.Search.newSearchString();
//            window.location.hash = hash;
//            ClinVitae.Search.locationHashChange();
//        });
    },
    open: function(gene,nucleotide,classification,description) {

        ClinVitae.Modal.close();

        $('#variant-gene').html(gene);
        $('#variant-nucleotide-change').html(nucleotide);
        $('#variant-reported-classification').html(classification);
        $('#variant-description').html(decodeURIComponent(description));

        $('#variant-screen').show();
        $('#variant').show();
    },
    close: function() {
        $('#variant-screen').hide();
        $('#variant').hide();
    }
}

// -----------------------
// fix encodedURIComponent
// -----------------------
function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
}

// -------------------------
// animated progress spinner
// -------------------------
ClinVitae.Spinner = {
    init: function() {
        $('#spinner-screen').show();
        $('#spinner').show();
    },
    stop: function() {
        $('#spinner-screen').hide();
        $('#spinner').hide();
    }
}

// ---------------------------
// search options flyout panel
// ---------------------------
ClinVitae.SearchOptions = {
    init: function() {
        $('#btn-options').on('click', function(){
            ClinVitae.SearchOptions.toggle_options();
            return false;
        });
        $('#btn-close-options').on('click', function(){
            ClinVitae.SearchOptions.close();
            return false;
        });
    },
    toggle_options: function(){
        if($('#search-options').is(':visible')) {
            $('#search-options').slideUp('fast');
            ClinVitae.SearchOptions.close();
        }
        else {
            $('#search-options').slideDown('fast');

            $('#search-options').on('click', function(e){
                e.stopPropagation();
            });
            $(document).bind('click',ClinVitae.SearchOptions.close);
        }
    },
    close: function() {
        if($('#search-options').is(':visible')) {
            $('#search-options').slideUp('fast');
        }
        $(document).unbind('click',ClinVitae.SearchOptions.close);
    }
}

// ------------------------------------
// track exit links in google analytics
// ------------------------------------
ClinVitae.Tracking = {
    init: function(){
        $('a[data-tracking=outbound]').on('click',
            function(){ClinVitae.Tracking.outbound($(this));return false;});
        $('a[data-tracking=download]').on('click',
            function(){ClinVitae.Tracking.download($(this));return false;});
    },
    outbound: function(e){
        var category = 'Outbound Link';
        var action = $(e).attr('data-label') + ' (' + $(e).attr('href') + ')';
        var link = window.location.href;
        ClinVitae.Tracking.log(category, action, link);

        setTimeout(function() {
            window.open($(e).attr('href'));
        }, 100);
    },
    download: function(e){
        var category = 'Download Database';
        var action = 'clinvitae_download.zip';
        var link = window.location.href;
        ClinVitae.Tracking.log(category, action, link);

        setTimeout(function() {
            window.location.href = $(e).attr('href');
        }, 100);
    },
    exportTSV: function(trackingInfo){
        var category = 'Export';
        var action = trackingInfo;
        var link = window.location.href;
        ClinVitae.Tracking.log(category, action, link);
    },
    search: function(){
        var category = 'Search';
        var action = $('#main-search').val();
        var link = window.location.href;
        ClinVitae.Tracking.log(category, action, link);
    },
    log: function(category, action, link){
        try {
            _gaq.push(['_trackEvent', category, action, link]);
        } catch(err){
            //console.log(err)
        }
    }
}

// --------------------------------------------------------
// placeholder for non HTML5 browsers and Internet Explorer
// --------------------------------------------------------
ClinVitae.Placeholder = {
    init: function() {
        if(!('placeholder' in document.createElement('input'))){
            $('[placeholder]').focus(function() {
                var input = $(this);
                if (input.val() == input.attr('placeholder')) {
                    input.val('');
                    input.removeClass('placeholder');
                }
            }).blur(function() {
                var input = $(this);
                if (input.val() == '' || input.val() == input.attr('placeholder')) {
                    input.addClass('placeholder');
                    input.val(input.attr('placeholder'));
                }
            }).blur();
            $('[placeholder]').parents('form').submit(function() {
                $(this).find('[placeholder]').each(function() {
                    var input = $(this);
                    if (input.val() == input.attr('placeholder')) {
                        input.val('');
                    }
                })
            });
        }
    }
}

// -------------------------------------------------
// unsupported browser version check - IE8 and below
// -------------------------------------------------
ClinVitae.isUnsupportedBrowser = {
    init: function() {
        var isUnsupportedBrowser = false;
        var rv = -1;
        if (navigator.appName == 'Microsoft Internet Explorer'){
            var ua = navigator.userAgent;
            var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null){
                rv = parseFloat( RegExp.$1 );
                if ( (rv >= 6.0) && (rv < 9.0) ){
                    isUnsupportedBrowser = true;
                }
            }
        }
        return isUnsupportedBrowser;
    }
}

// ---------------------------------------------
// load default page when there's no hash string
// ---------------------------------------------
$(document).ready(function(){
    var params = {};
    var ps = window.location.hash.split(/#|&/);
    for (var i = 0; i < ps.length; i++) {
        if (ps[i]) {
            var p = ps[i].split(/=/);
            params[p[0]] = p[1];
        }
    }
    if (params['q'] && params['source'] && params['classification']){
        ClinVitae.Search.update(params);
    }
    else{
        $('#search-page').addClass('default');
    }
    ClinVitae.Search.customSortNucleotideChanges();
    ClinVitae.Search.customCheckboxFilter();

    ClinVitae.Tracking.init();
});

$(window).load(function () {
    if($('#search-page').hasClass('default')){
        ClinVitae.Search.focus($('#main-search'));
        if (ClinVitae.isUnsupportedBrowser.init()){
            $('#search-page').addClass('alternate-image');
        }
        else{
            ClinVitae.D3.init();
        }
    }
    ClinVitae.Search.init();
    ClinVitae.Search.locationHashChange();
    ClinVitae.SearchOptions.init();
    ClinVitae.About.init();
    ClinVitae.Variant.init();
    ClinVitae.Placeholder.init();
});