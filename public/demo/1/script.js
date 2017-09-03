$(function(){
    $("body").height($(window).height());
    
    var filename = "data.js";
    var ip = '199.16.198.147';

    var edgesLength1stQ, edgesLength2ndQ, edgesLength3rdQ;
    var container;
    var gnodesCenter, zoom;
    var w, h;

    var selection = {"length":[], "type":[], "group":[]};
    function _hasClass(d, cls){
        return d3.selectAll(d).attr("class").split(" ").indexOf(cls) != -1;
    }
    //edge
    function edgesClassName(d){
        var lname;
        if(d.length < edgesLength1stQ){
            lname = "length1";
        }else if(d.length < edgesLength2ndQ){
            lname = "length2";
        }else if(d.length < edgesLength3rdQ){
            lname = "length3";
        }else{
            lname = "length4";
        }
        var tname = "type" + d.last;
        var nname, nip;
        if(d.source.index == 0){
            nip = d.target.name.replace(/\./g, '_');
            nname = d.target.group;
        }else{
            nip = d.source.name.replace(/\./g, '_');
            nname = d.source.group;
        }
        return nip + " " + nname + " " + tname + " " + lname;
    }
    function clearInfo(){
        $("#popup-ip").html("-");
        $("#popup-sync").html("-");
        $("#popup-syncack").html("-");
        $("#popup-open").html("-");
        $("#popup-fin").html("-");
        $("#popup-finack").html("-");
        $("#popup-closing").html("-");
        $("#popup-closed").html("-");
        $("#popup-reset").html("-");
        $(".popup-link").attr("href", "javascript: void(0)")
                        .addClass("disabled");
    }
    //node
    function nodesMouseover(d){

    }
    function nodesMouseout(d){

    }
    //zoom param


    var prevClicked = false;
    function nodesClicked(d){
        var me = d3.select(this);
        var clicked = true;
        if(!prevClicked){
            //first click
            me.classed("clicked", true);
            prevClicked = this;
        }else{
            d3.select(prevClicked).classed("clicked", false);
            if(this == prevClicked){
                //deselect
                prevClicked = false;
                clicked = false;
            }else{
                //change node
                me.classed("clicked", true);
                prevClicked = this;
            }
        }
        if(clicked){
            //show information
            $("#popup-ip").html(d.name);
            $.map(["#popup-reset","#popup-sync","#popup-syncack","#popup-open","#popup-fin","#popup-finack","#popup-closing","#popup-closed"],
                function(e, i){
                    $(e).html(d.info[i]);
                });
            $("#popup-conn").attr("href", "/mawi-project/timeline/timeline.html?ip1=" + ip + "&ip2=" + d.name + "&t=201403311400")
                            .removeClass("disabled");
            $("#popup-netw").attr("href", "/mawi-project/graph/graph.php?ip=" + d.name + "&t=201403311400")
                .removeClass("disabled");

            //zoom forward
            var centerdata = gnodesCenter.data()[0],
                cx = centerdata.x, cy = centerdata.y,
                ax = d.x, ay = d.y,
                dx = Math.abs(cx - ax) + 20,
                dy = Math.abs(cy - ay) + 20,
                ccx = (ax+cx)/2,
                ccy = (ay+cy)/2,
                width = $(".graph").width(), height = $(".graph").height(),
                scale = 0.8 / Math.max(dx / width, dy / height),
                translate = [width / 2 - scale * ccx, height / 2 - scale * ccy];

                container.transition()
                        .duration(750)
                        .call(zoom.translate(translate).scale(scale).event);
            d.fixed = true;
        }else{
            clearInfo();
            container.transition()
                        .duration(750)
                        .call(zoom.translate([0,0]).scale(1).event);
            d.fixed = false;
        }
    }
    //feature
    var prevScale, prevTranslate;
    function zoomed() {
        container.attr("transform", "translate(" + (prevTranslate = d3.event.translate) + ")scale(" + (prevScale = d3.event.scale) + ")");
    }
    function _selectionMapFunc(d){
        return ".graph ." + d;
    }
    function _getSelectionArray(d){
        if(d[0] == "t")
            return selection.type;
        else if(d[0] == "l")
            return selection.length;
        else
            return selection.group;
    }
    function selectionIsEmpty(){
        return selection.length.length == 0 &&
                selection.type.length == 0 &&
                selection.group.length == 0;
    }
    function selectionCategoryIsEmpty(i){
        return _getSelectionArray(i).length == 0;
    }
    function hasSelected(i){
        return _getSelectionArray(i).indexOf(i) != -1;
    }
    function removeFromSelection(i){
        var selection = _getSelectionArray(i);
        var index = selection.indexOf(i);
        if(index == -1)	return;
        selection.splice(index, 1);
    }
    function addToSelection(i){
        var selection = _getSelectionArray(i);
        var index = selection.indexOf(i);
        if(index == -1)	selection.push(i);
    }
    function getSelection(){
        if(selectionIsEmpty())	return $();
        var ls = selection.length.map(_selectionMapFunc).join(", ");
        var ts = selection.type.map(_selectionMapFunc).join(", ");
        var gs = selection.group.map(_selectionMapFunc).join(", ");

        return $((ls.length > 0)?ls:"*")
                .filter($((ts.length > 0)?ts:"*"))
                .filter($((gs.length > 0)?gs:"*"));
    }
    function hoverSelection(i){
        if(selectionIsEmpty())	return $(".graph ." + i);
        if(hasSelected(i)) return getSelection();
        addToSelection(i);
        var s = getSelection();
        removeFromSelection(i);
        return s;
    }
    function dehovered(){
        d3.selectAll($(".graph .hovered:not(.selected)")).classed("hovered", false);
        d3.selectAll($(".graph .selected")).classed("hovered", true);
        if(selectionIsEmpty()){
            $(".graph").removeClass("hovered").removeClass("super-hovered");
        }
    }
    $.getScript(filename, function() {
        w = $(".graph").width();
        h = 450;
        var maxlinklength = 100;
        var minlinklength = 15;
        //zoom
        zoom = d3.behavior.zoom()
                .scaleExtent([0.01, 20])
                .on("zoom", zoomed);

        var edgesLengthArray = []
        edges.forEach(function(d, i){
            //for edge length
            edgesLengthArray.push(d.length);
            //search for node
            nodes[(d.source==0)?d.target: d.source].edge = d;
        });
        edgesLengthArray.sort((function(a,b){return a-b}));

        var minLength = edgesLengthArray[0];
        var maxLength = edgesLengthArray[edgesLengthArray.length-1];
        edgesLength1stQ = edgesLengthArray[parseInt(edgesLengthArray.length/4)];
        edgesLength2ndQ = edgesLengthArray[parseInt(edgesLengthArray.length/2)];
        edgesLength3rdQ = edgesLengthArray[parseInt(3*edgesLengthArray.length/4)];

        var lengthScale = d3.scale.linear()
                        .domain([minLength, maxLength])
                        .range([maxlinklength,minlinklength]);

        var force = d3.layout.force()
                    .nodes(nodes)
                    .links(edges)
                    .linkDistance(function(link,index){
                        return lengthScale(link.length);
                    })
                    .size([w, h])
                    .friction(0.5)
                    .start();

        var svg = d3.select(".graph").append("svg:svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .append("svg:g")
                .call(zoom);

        container = svg.append("g");

        var background = container.append("rect")
                        .classed("background", true)
                        .attr("x",-50000)
                        .attr("y",-50000)
                        .attr("width",100000)
                        .attr("height",100000)
                        .attr("fill", "white")
                        .attr("opacity",0);

        var gedges = container.append("svg:g")
                    .attr("class", "edges")
                    .selectAll("line")
                    .data(edges)
                    .enter()
                    .append("line")
                    .style("stroke-width", 1)
                    .attr("class", edgesClassName);

        var gnodesContainer = container.append("svg:g")
                            .attr("class", "nodes");

        gnodesCenter = gnodesContainer
                            .selectAll("circle")
                            .data([nodes[0]])
                            .enter()
                            .append("circle")
                            .attr("r", 3)
                            .attr("fill", "black")
                            .call(force.drag);

        var gnodesSquare = gnodesContainer.append("svg:g")
                            .attr("class", "square")
                            .selectAll("path")
                            .data(nodes.filter(function(d){ return d.group == "src"; }))
                            .enter()
                            .append("path")
                            .attr("d", d3.svg.symbol().type("square"))

                            .attr("class", function(d){
                                return edgesClassName(d.edge);
                            })
                            .call(force.drag)
                            .on("click", nodesClicked)
                            .on("mouseover", nodesMouseover)
                            .on("mouseout", nodesMouseout);

        var gnodesTriangle = gnodesContainer.append("svg:g")
                            .attr("class", "triangle")
                            .selectAll("path")
                            .data(nodes.filter(function(d){ return d.group == "dst"; }))
                            .enter()
                            .append("path")
                            .attr("d", d3.svg.symbol().type("triangle-up"))
                            .attr("class", function(d){
                                return edgesClassName(d.edge);
                            })
                            .call(force.drag)
                            .on("click", nodesClicked)
                            .on("mouseover", nodesMouseover)
                            .on("mouseout", nodesMouseout);

        force.on("tick", function(){
            gedges.attr("x1", function(d){
                return d.source.x;
            })
            .attr("y1", function(d){
                return d.source.y;
            })
            .attr("x2", function(d){
                return d.target.x;
            })
            .attr("y2", function(d){
                return d.target.y;
            });

            gnodesSquare.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")scale(0.3)";
            });
            gnodesTriangle.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")scale(0.3)";
            });

            gnodesCenter.attr("cx", function(d){
                return d.x;
            }).attr("cy", function(d){
                return d.y;
            });
        });
        $("#legendcontainer td").hover(function(e){
            var c = $(this).attr("class");
            d3.selectAll($(".graph .hovered")).classed("hovered", false);
            d3.selectAll(hoverSelection(c))
                .classed("hovered", true);
            $(".graph").addClass("hovered").addClass("super-hovered");
        }, dehovered);
        $("#legendcontainer td").click(function(e){
            var c = $(this).attr("class");
            if($(this).parent().hasClass("selected")){
                removeFromSelection(c);
                if(selectionIsEmpty()){
                    $(".graph").removeClass("hovered");
                }
                if(selectionCategoryIsEmpty(c)){
                    $(this).parentsUntil("table").removeClass("selected");
                }
                $(this).parent().removeClass("selected");
            }else{
                addToSelection(c);
                $(".graph").addClass("hovered");
                //legend
                $(this).parentsUntil("table").addClass("selected");
                $(this).parent().addClass("selected");
            }
            d3.selectAll(".graph .hovered, .graph .selected")
                .classed("hovered", false)
                .classed("selected", false);
            d3.selectAll(getSelection()).classed("hovered", true)
                                        .classed("selected", true);

            //show ip list
            showShowListButton();
            if(!$("#iplist").hasClass("hide")){
                showIPs();
            }
        });
        $("#loadingcontainer").addClass("hide");

        setTimeout(function(){
            nodes[0].fixed = true;
        }, 5000);

        function iptonum(ip){
            var ipsplit = ip.split(".");
            var nums = $.map(ipsplit, function(e,i){
                return parseInt(e) * Math.pow(256,4-i);
            });
            return nums[0] + nums[1] + nums[2] + nums[3];
        }
        function cmpip(a,b){
            return iptonum(a) - iptonum(b);
        }
        function showIPs(){
            var list =
            $("line.selected").map(function(i,d){
               return $(d).attr("class").split(" ")[0].replace(/_/g,".");
            }).sort(cmpip);
            if(list.length > 0){
                console.log("?");
                var val = ""
                list.each(function(i,d){
                    val += d + "\n";
                });

                $("#iptextarea").html(val)
                                .attr("rows", Math.min(list.length,20))
                                .attr("cols", 20);
                $("#iplist").css("top", $("#getlistbtn").position().top - $("#iplist").height())
                            .removeClass("hide");
            }
        }
        //show list button
        function showShowListButton(){
            console.log("show!");
            //check is there any selection
            console.log($("line.selected").length)
            if($("line.selected").length > 0){
                //show
                $("#getlistbtn").removeClass("hide");
            }else{
                //hide
                $("#getlistbtn").addClass("hide").html("Get List of Highlighted IP");
                $("#iplist").addClass("hide");
            }
        }
        $("#getlistbtn").click(function(){
            if($("#iplist").hasClass("hide")){
                showIPs();
                $("#getlistbtn").html("Hide List of Highlighted IP");
            }else{
                $("#iplist").addClass("hide");
                $("#getlistbtn").html("Get List of Highlighted IP");
            }
        });
        //
        var client = new ZeroClipboard($("#copybutton"));
        client.on('ready', function(){
            client.on('copy', function(){
                $("#copyalert").removeClass("hide");
                setTimeout(function(){
                    $("#copyalert").addClass("hide");
                    }, 1000);
            });
        });
    	client.config({ swfPath: "https://cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.2.0/ZeroClipboard.swf"});
    });
});
