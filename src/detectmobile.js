/**
 * @singleton
 * 
 * @version 0.1
 * 
 * detectmobile.js - simple mobile redirects with Javascript
 *
 * @author Mikko Ohtamaa, Jussi Toivola
 *
 */
var detectmobile = {
    
    /**
     * Function callback(mode, url) which is called if switch happens.
     * 
     * If the 
     */
    redirectCallback : null,

    /**
     * Redirect target when the user wants to go the website.
     * 
     * Usually the website homepage. For dynamic URL mappins
     * define redirectCallback() function.
     */
    
    defaultMobileURL : null,
    
    /**
     * @type Array
     * 
     * If any of hostname domain parts matches this list assume we are on a mobile site. 
     */
    mobileSiteDomainIdentifiers : ["m", "mobi"],
           
    /**
     * @type Number
     * 
     * How wide the screen must be in the pixels for the browser
     * to be considered be a mobile browser. 
     * 
     * The default behavior is to put screens < 960 to the mobile site.
     * 
     */
    thresholdWidthInPixels : 970, // iPhone 4 is 960
    
    /**
     * The cookie name set when we force the mobile browser to stick on the website.
     */
    cookieName : "detectmobile-stick-on-web",
    
    /**
     * HTTP GET query parameter name used to detect forcing the web mode.
     */
    forceWebParameter : "force-web",

    /**
     * Use this HTTP GET query parameter name to make browsers come back from the forced web site to the mobile site.
     */
    forceMobileParameter : "force-mobile",

    //////////////////////////                  
                 
    /**
     * Perform a redirect to a mobile site if needed
     */ 
    process : function() {      
    
        var currentURL = window.location.href;
        
        var parameters = this.splitURLParameters(currentURL);
        
        var oldCookie = this.readCookie(this.cookieName);
        
        if(this.forceWebParameter in parameters) {
           this.createCookie(this.cookieName, "true");
           // No longer redirects to mobile
           return;
        }
        
        if(this.forceMobileParameter in parameters) {
           this.eraseCookie(this.cookieName);
           // Stay on the mobile site
           return;
        }       
        
        // Then check if we need to stick on the web site
        // based on cookie
        if(oldCookie) {
            return;
        }
        
        // Check if we are already on the mobile domain
        // - no action needed
        if(this.isOnMobileSite()) {
            return;     
        }
                
        // If we are not on the mobile site then we must be on the web site...
        
        // Do the feature detection
        if(this.detectMobile()) {
             // Based on the feature deteciton this looks like we are on the mobile site
             var url = this.getRedirectTarget("mobile", currentURL);
             this.performRedirect(url);
        }
        
    },
    
    
    /**
     * Rewrite URL for moving from the website to a mobile site or vice versa.
     * 
     * If detectmobile has no callback() set, just redirect to the 
     * site root using defaultWebURL or defaultMobileURL
     * 
     * @param {String} mode "web" or "mobile"
     * 
     * @param {String} url The current URL 
     */
    getRedirectTarget : function(mode, url) {
    	
	var newURL = null;
	
        if(this.redirectCallback) {
               newURL = this.redirectCallback(mode, url);
        } else {
               if(mode == "mobile") {
                       newURL = this.defaultMobileURL;
               } 
        }
        
        if(!newURL) {
               throw "Cannot redirect to " + mode + " because target URL cannot be resolved by detectmobile.js";
        }
        
        return newURL;
    },
    
    /**
     * Do redirect to a new page using Javascript
     * 
     * @param {Object} url
     */
    performRedirect : function(url) {
        
        if(url == window.location.href) {
            // Force reload
            window.location.reload();
            return;
        }
        
        window.location = url;
        
    },
    
    /**
     * Helper function to rewrite domain name to URLs.
     * 
     * E.g. site.com -> m.site.com
     * 
     * Port part is not touched in the domain name: site.com:8080 -> m.site.com:8080. 
     * 
     * @param {String} url Full http/https URL
     * 
     * @param {String} newDomain New domain name to be injected, with optional 
     * 
     * @return {String} URL where domain part has been replaced by newDomain
     */
    replaceDomainName : function(url, newDomain) {
        if(url.substring(0, 4) != "http") {
                throw "Only absolute http/https URLs supported";
        }
                
        var split = url.split("/");
        
        if(split.length <2) {
                throw "Cannot understand:" + url;
        }
        
        // http [0] / [1] / domain : port [2] /
        var host = split[2];
	        
        hostparts = host.split(":");
        
        if(hostparts.length > 1) {
                hostparts = [newDomain, hostparts[1]]
        } else {
                hostparts = [newDomain];
        }
        
        var host = hostparts.join(":");
        
        var newsplit = [ split[0], split[1], host ];
        
        for(var i=3; i<split.length; i++) {
                newsplit.push(split[i]);
        }
        
        return newsplit.join("/");
                        
    },
      
    /** Add new URL variables safely with or without existing '?' character */
    addURLParameter : function(aURL, aNewVar){
        var args = mobilize.getUrlVars(aURL);
        var newurl = aURL.split("?",1)[0];
        newurl += "?";
        
        var items = [];
        for(var i = 0; i < args.length; i++) {
            var a = args[i];
            var value = args[a];
            items.push(a + "=" + value);
        }
        
        items.push(aNewVar);
        
        newurl += items.join("&");
        return newurl;
    },
    /** 
     * Read URL parameters to dict.
     * 
     * See: http://jquery-howto.blogspot.com/2009/09/get-url-parameters-values-with-jquery.html
     */
    splitURLParameters : function (aURL) {
        if(!this._urlvars) {
            this._urlvars = {};
        }
        if(!aURL) {
            aURL = window.location.href;
        }
        
        // Cache window.location.href call results
        if(this._urlvars[aURL]) {
            return this._urlvars[aURL];
        }
        
        var vars = [], hash;

        if(aURL.indexOf("#") >= 0 ){
            aURL = aURL.slice(0,aURL.indexOf("#"));
        }
        var hashes = aURL.slice(aURL.indexOf('?') + 1).split('&');
        
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        
        this._urlvars[aURL] = vars;
        return vars;
    },
    
    

    /**
     * Create a new cookie 
     * 
     * @see http://www.quirksmode.org/js/cookies.html     
     */
    createCookie : function(name,value,days) {
        var expires = "";
        
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            expires = "; expires="+date.toGMTString();
        }
        document.cookie = name+"="+value+expires+"; path=/";
    },
    
    /**
     * Get a cookie value by name 
     * 
     * @see http://www.quirksmode.org/js/cookies.html     
     */
    readCookie : function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)===' ') {
                c = c.substring(1,c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length,c.length);
            }
        }
        return null;
    },
    /** 
     * See: http://www.quirksmode.org/js/cookies.html     
     */
    eraseCookie : function(name) {
        mobilize.createCookie(name,"",-1);
    },
    

    /** 
     * Core logic of detecting a mobile browser.
     * 
     * Use user agent capabilities available in Javascript to
     * make a heurestic decision whether this browser is mobilish
     * or not.
     * 
     * I.e. check the screen size. 
     *
     * @return True if the current browser is a mobile browser
     */ 
    detectMobile: function(){
        var dimensions  = this.getScreenDimensions();
	alert("testing screen width:" + dimensions.width);
        if(dimensions.width <= this.thresholdWidthInPixels) {
               return true;
        }
        
        return false;
    },
    
    /**
     * https://developer.mozilla.org/en/DOM/window.screen.width
     * 
     * XXX: Add DPI detection http://stackoverflow.com/questions/476815/can-you-access-sceen-displays-dpi-settings-in-a-javascript-function
     */
    getScreenDimensions : function() {
        return {
                width : window.screen.availWidth,
                height : window.screen.availHeight
        }
    },
    
    /**
     * Check if the current location is on a mobile site.
     * 
     * Use domain name based detection - check if the domain name resembles any common 
     * names used for the mobile domains.
     * 
     * @return true if the 
     */
    isOnMobileSite : function() {
        var domainName = window.location.hostname;
	
        var parts = domainName.split(".");
        
        for(var i=0; i<parts.length; i++) {
            for(var l=0; l<this.mobileSiteDomainIdentifiers.length; l++) {
                if(parts[i] == this.mobileSiteDomainIdentifiers[l]) {
                        return true;
                }       
            }
        }               
        return false;
    }

       
};
