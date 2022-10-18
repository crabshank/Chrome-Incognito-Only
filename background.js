function getUrl(tab) {
	return (tab.url == "" && !!tab.pendingUrl && typeof tab.pendingUrl !== 'undefined' && tab.pendingUrl != '') ? tab.pendingUrl : tab.url;
}

function isChrTab(tu) {
	return ( tu.startsWith('chrome://') || tu.startsWith('chrome-extension://') ||  tu.startsWith('about:') )?true:false;
}
try {

var whitelist=[];
var tb_wait=[];

function removeEls(d, array){
	var newArray = [];
	for (let i = 0; i < array.length; i++)
	{
		if (array[i] != d)
		{
			newArray.push(array[i]);
		}
	}
	return newArray;
}

function findIndexTotalInsens(string, substring, index) {
    string = string.toLocaleLowerCase();
    substring = substring.toLocaleLowerCase();
    for (let i = 0; i < string.length ; i++) {
        if ((string.includes(substring, i)) && (!(string.includes(substring, i + 1)))) {
            index.push(i);
            break;
        }
    }
    return index;
}

function blacklistMatch(array, t) {
    var found = false;
	var blSite='';
    if (!((array.length == 1 && array[0] == "") || (array.length == 0))) {
        ts = t.toLocaleLowerCase();
        for (var i = 0; i < array.length; i++) {
            let spl = array[i].split('*');
            spl = removeEls("", spl);

            var spl_mt = [];
            for (let k = 0; k < spl.length; k++) {
                var spl_m = [];
                findIndexTotalInsens(ts, spl[k], spl_m);

                spl_mt.push(spl_m);


            }

            found = true;

            if ((spl_mt.length == 1) && (typeof spl_mt[0][0] === "undefined")) {
                found = false;
            } else if (!((spl_mt.length == 1) && (typeof spl_mt[0][0] !== "undefined"))) {

                for (let m = 0; m < spl_mt.length - 1; m++) {

                    if ((typeof spl_mt[m][0] === "undefined") || (typeof spl_mt[m + 1][0] === "undefined")) {
                        found = false;
                        m = spl_mt.length - 2; //EARLY TERMINATE
                    } else if (!(spl_mt[m + 1][0] > spl_mt[m][0])) {
                        found = false;
                    }
                }

            }
            blSite = (found) ? array[i] : blSite;
            i = (found) ? array.length - 1 : i;
        }
    }
    //console.log(found);
    return [found,blSite];

}

function save_options(){
	
		chrome.storage.sync.clear(function() {
				chrome.storage.sync.set(
				{
					wList: ""
				}, function(){
					console.log('Default options saved.');
					restore_options();
				});
		});

}

function restore_options(){
	
	if(typeof chrome.storage==='undefined'){
		restore_options();
	}else{
	chrome.storage.sync.get(null, function(items){
		
		if (Object.keys(items).length != 0)
		{

			if(!!items.wList && typeof  items.wList!=='undefined'){
				whitelist=items.wList.split('\n').join('').split(',');
			}
		
		}else{
			save_options();
		}
	});
	}
}

restore_options();

function create_tab_rem(wid, tu, tbr){
		chrome.tabs.create({url: tu, windowId: wid}, (tab)=>{
			chrome.tabs.remove(tbr);
		});
}

function procTab(tab,tu,wlMatch){
	if(!tab.incognito && !isChrTab(tu) && !wlMatch[0]){
			let wt=null;
			let tbr=tab.id;
			chrome.windows.get(tab.windowId,(tw)=>{
				wt=tw.type;
				chrome.windows.getAll( { "populate" : false}, (w)=>{
					let ci=w.filter((d)=>{return d.incognito==true;});
					let pt=true;
					if(ci.length>0){
						let cfix=ci.findIndex((d)=>{return d.focused && d.type===wt;});
						if(cfix>=0){
							pt=false;
							create_tab_rem(ci[cfix], tu, tbr);
						}
					}
					
					if(pt){
						chrome.windows.create({focused: true, incognito: true, type:( (wt===null)? 'normal' : wt ),  url: tu},(wnd)=>{
								chrome.tabs.remove(tab.id);
						});
					}
					
				});	
		});
	}else if(wlMatch[0]){
				console.group('Incognito only: ');
					console.log('Current site is whitelisted ("'+wlMatch[1]+'")');
					console.dir(tab);
				console.groupEnd();
	}
}

function replaceTabs(r,a){
	for(let i=tb_wait.length-1; i>=0; i--){
		if(tb_wait[i]===r){
			tb_wait[i]=a;
		}
	}
}

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	replaceTabs(removedTabId,addedTabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab)=>{
	let tu=getUrl(tab);
	let wlMatch=blacklistMatch(whitelist,tu);
	if(changeInfo.url && !isChrTab(tu) && !wlMatch[0]){
		let ix=tb_wait.findIndex((d)=>{return tabId===d;});
		if(ix>=0){
			tb_wait=tb_wait.filter((d)=>{return tabId!==d;});
			procTab(tab,tu,wlMatch);
		}
	}
});

chrome.tabs.onCreated.addListener((tab)=>{
		let tu=getUrl(tab);
		
		if(tu==='' || isChrTab(tu)){
			tb_wait.push(tab.id);
		}else{
			let wlMatch=blacklistMatch(whitelist,tu);
			 procTab(tab,tu,wlMatch);
		}
});

}catch(e){;}