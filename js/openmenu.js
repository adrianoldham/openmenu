var OpenMenu = Class.create({
    options: {
        childHolderSelector: "ul",
        childSelector: "li",
        openDuration: 200,
        animate: true,
        activeClass: "active",
        openedClass: "opened",
        widgetClass: "widget",
        widgetExpandedClass: "expanded",
        singleMode: true,
        animateOnLoad: false,
        pathPrefix: "",
        parentClass: "parent"
    },
    
    initialize: function(element, options) {
        this.options = Object.extend(Object.extend({ }, this.options), options || { });
        
        // create the root element
        this.element = $(element);
        this.element = new OpenMenu.Item(element, this.options);
        
        // attempt to open an element that has an anchor matching the current location
        this.openElementWithHref(window.location.href);
    },
    
    // Opens the element that has a link linking to the current location
    // DOES NOT animate it
    openElementWithHref: function(href) {
        var element;
        
        // search through ALL descendants and return the one with
        // href that matches the specified href
        this.element.descendants().each(function(descendant) {
            if (this.cleanHref(descendant.anchor.href) == this.cleanHref(href)) {
                element = descendant;
            }
        }.bind(this));
        
        // only open one if one is found
        if (element) element.open(!this.options.animateOnLoad, true);
    },
    
    // Makes the path relative
    cleanHref: function(href) {
        return this.options.pathPrefix + href.replace(new RegExp('.+?://[^/]+'), "");
    }
});

OpenMenu.Item = Class.create({
    options: {
    },
    
    initialize: function(element, options, parent) {
        this.options = Object.extend(Object.extend({ }, this.options), options || { });
        
        this.element    = $(element);
        this.parent     = parent;
        
        if (!this.isRoot()) {
            this.anchor = this.element.select('a').first();
        } else {
            this.opened = true;
        }
        
        this.setupLevel();   
        this.setupChildren();
        this.setupWidget();
        
        if (!this.isRoot()) {    
            if (this.hasChildren()) {            
                this.element.classNames().add(this.options.parentClass);
            }
        }
    },
    
    // Calculates the level this item is at based on parent's level (0 if root)
    setupLevel: function() {
        if (this.isRoot()) {
            this.level = 0;
        } else {
            this.level = this.parent.level + 1;
        }
    },
    
    // Creates all the children of this element
    setupChildren: function() {
        if (this.isRoot()) {
            this.childrenHolder = this.element;
        } else {
            this.childrenHolder = this.element.select(this.options.childHolderSelector).first();   
        }
        
        // only grab children if a child holder element exists
        if (this.childrenHolder) {
            // hide the children by default
            if (!this.isRoot()) this.childrenHolder.hide();
        
            this.children = this.childrenHolder.select(this.options.childSelector).map(function(child) {
                if (child.parentNode == this.childrenHolder) {
                    return new OpenMenu.Item(child, this.options, this);
                }
            }.bind(this)).compact();
        } else {
            this.children = [];
        }
    },
    
    setupWidget: function() {
        // only create widget if children exist, and is not the root element
        if (this.hasChildren() && !this.isRoot()) {
            this.widget = new Element('div', { 'class': this.options.widgetClass });
            this.widget.observe('click', this.toggle.bind(this));
            this.element.insert({ top: this.widget });
        }
    },
    
    // Returns true if the element is a root element
    isRoot: function() {
        return this.parent == null;
    },
    
    // Return whether this element has children or not
    hasChildren: function() {
        return this.children.length > 0;
    },
    
    // Returns all this elements descendants including itself
    descendants: function() {
        var descendants = [];
        
        // if the root, then don't include the root element
        if (!this.isRoot()) {
            descendants.push(this);
        }
        
        this.children.each(function(child) {
            var childDescendants = child.descendants();
            childDescendants.each(function(element) { descendants.push(element); });
        });

        return descendants;
    },
    
    
    // Calculates amount of levels to the closest opened ancestor
    // then use it as the delay for the animation
    distanceToClosestOpenedAncestor: function() {        
        // calculate amount of levels to the closest opened ancestor
        // then use it as the delay for the animation
        var element = this;
        while (true) {
            if (element == null || element.opened) break;
            element = element.parent;
        }
        var levelDifference = this.level;
        if (element != null) {
            levelDifference -= element.level;
        }
        
        return levelDifference - 1;
    },
    
    // Toggles the element open and closed.
    toggle: function() {
        if (this.opened) {
            this.close();
        } else {
            this.open();
        }
    },
    
    // Figure out if we need to animate or not
    animateOverride: function(noAnimation) {
        // figure out if we need to animate
        var animate = this.options.animate;
        if (noAnimation) animate = false;
        
        return animate;
    },
    
    // Closes the element, and makes all the children invisible
    close: function(noAnimation) {
        if (!this.opened || this.animating) return;
        
        // figure out if we need to animate
        var animate = this.animateOverride(noAnimation);

        this.element.classNames().remove(this.options.openedClass);        
        this.anchor.classNames().remove(this.options.openedClass);
        
        this.opened = false;
        
        // if widget exist, then make it display collapse mode
        if (this.widget) {
            this.widget.classNames().remove(this.options.widgetExpandedClass);
        }
        
        // only attempt to hide children on select if they exist
        if (this.hasChildren()) {
            // cancel previous animation before doing the new ones
            // animate only if required
            if (!animate) {
                this.childrenHolder.hide();
            } else {
                clearTimeout(this.openerTimer);
                
                this.openerTimer = setTimeout(function() {   
                    if (this.effect) { 
                        this.effect.cancel();
                    }
                    
                    this.animating = true;

                    this.effect = new Effect.BlindUp(this.childrenHolder, {
                        duration: this.options.openDuration / 1000,
                        afterFinish: function() { this.animating = false; }.bind(this)
                    }); 
                }.bind(this));
            }
        }
    },
    
    // Opens the element, and makes all the children visible
    open: function(noAnimation, makeActive) {
        // don't do anything if already opened
        if (this.opened || this.animating) return;
        
        // set active class if make active is true
        if (makeActive && this.anchor != null) {
            this.element.classNames().add(this.options.activeClass);
            this.anchor.classNames().add(this.options.activeClass);
        }
        this.element.classNames().add(this.options.openedClass);
        this.anchor.classNames().add(this.options.openedClass);
        
        // if widget exist, then make it display collapse mode
        if (this.widget) {
            this.widget.classNames().add(this.options.widgetExpandedClass);
        }
        
        // figure out if we need to animate
        var animate = this.animateOverride(noAnimation);
        
        var levelDifference = this.distanceToClosestOpenedAncestor();
        
        this.opened = true;
        
        // if not the root element, then make sure it's parent is selected and opened too
        // this is a recursive functionOpenMenu
        if (!this.isRoot()) {
            this.parent.open(noAnimation, makeActive);
            
        
            if (this.options.singleMode) {
                this.parent.children.each(function(child) {
                    if (child != this) child.close(noAnimation);
                }.bind(this));
            }
        }
        
        // only attempt to show children on select if they exist
        if (this.hasChildren()) {
            // cancel previous animation before doing the new ones
            // animate only if required
            if (!animate) {
                this.childrenHolder.show();
            } else {
                clearTimeout(this.openerTimer);
                
                this.openerTimer = setTimeout(function() {   
                    if (this.effect) { 
                        this.effect.cancel();
                    }
                    
                    this.animating = true;

                    this.effect = new Effect.BlindDown(this.childrenHolder, {
                        duration: this.options.openDuration / 1000,
                        afterFinish: function() { this.animating = false; }.bind(this)
                    }); 
                }.bind(this), levelDifference * this.options.openDuration);
            }
        }
    }
})