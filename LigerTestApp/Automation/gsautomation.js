//
//  gsautomation.js
//  GSAutomation
//
//  Created by Bao Lei.
//  Copyright (c) 2013 Hulu. All rights reserved. See LICENSE.txt.
//

/** @return true if the device is iPad or iPad simulator
 */
function isPad() {
    return UIATarget.localTarget().model().indexOf("iPad")>=0;
}

var Direction = {
    Up    : {value:0, name:"Up"},
    Down  : {value:1, name:"Down"},
    Left  : {value:3, name:"Left"},
    Right : {value:4, name:"Right"}
};

/** BDD Information Variables **/
var Feature = "feature";
var Note = "note";

var Check = "check";
var Tap = "tap";
var TryTap = "tryTap";
var Investigate = "investigate";
var Input = "input";
var Wait = "wait";
var Scroll = "scroll";
var Swipe = "swipe";
var TapPoint = "tapPoint";
var WaitFor = "waitFor";
var Pick = "pick";
var CheckButtonEnabled = "checkButtonEnabled";

var GlobalEnv = {
    // Configs
    // Users can set these values 
    DefaultMaxWaitingTime : 10,
    EnableTableGroup : false,

    // Results
    // gsautomation.js should write to these variables
    ChildrenArrayCache : {},
    Pass : true,
    CurrentFeature : null,
};

/** Internal constants **/
var NotMissingButStillFail = "notMissingButStillFail";


/// Shortcut for Start Feature
function logFeature(str) {
    UIALogger.logStart("➜ FEATURE > " + str);
    GlobalEnv.CurrentFeature = str;
}

/// Shortcut for Log Messages
function logNote(str) {
    UIALogger.logMessage("⚑ NOTE > " + str);
}

/// Shortcut for debug log
function log(str) {
	UIALogger.logDebug(str);
}

function logStepPass(str) {
    UIALogger.logMessage("✔ PASS > " + str);
}

function logIssue(str) {
    UIALogger.logIssue("⚠ ISSUE > " + str);
}

function logFail(str) {
    UIALogger.logFail("✘ FAIL > " + str);
}
/// short cut for getting main window
function win() {
	return UIATarget.localTarget().frontMostApp().mainWindow();
}

/// short cut for delay
function wait(i) {
	UIATarget.localTarget().delay(i);
}

/** Checks if 2 elements overlap
 */
function overlap(element1, element2) {
    var rect1 = element1.rect();
    var rect2 = element2.rect();
    return (rect1.origin.x + rect1.size.width > rect2.origin.x && rect2.origin.x + rect2.size.width > rect1.origin.x 
            && rect1.origin.y + rect1.size.height > rect2.origin.y && rect2.origin.y + rect2.size.height > rect1.origin.y);
}

/** return the center point of a rect, a dict with x and y
 */
function centerPoint(r) {
    return {x: (r.origin.x+r.size.width/2), y: (r.origin.y+r.size.height/2)};
}


/** return the screen center point, a dict with x and y
 */
function screenCenter() {
    var size = win().rect().size;
    return {x: size.width/2, y: size.height/2};
}

/** check if an element is inside screen
 */
function inScreen(element) {
    if (!element || !(element instanceof UIAElement)) return false;
    var size = element.rect().size;
	return overlap(element, win()) && size.width>0 && size.height>0;
}

/** converts a rect object to a string
 */
function rect2str(r) {
    return "(" + r.origin.x + ", " + r.origin.y + ") w=" + r.size.width + ", h="+ r.size.height;
}

/** Get an array of children for an element.
 * if allowCache is true, it might return the result from last childrenArray call
 */
function childrenArray(element, allowCache) {
    var elementText = debugText(element);
    if (allowCache) {
        var cachedArray = GlobalEnv.ChildrenArrayCache[elementText];
        if (cachedArray) {
            return cachedArray;
        }
    }
    var children = (element instanceof UIATableView)? element.visibleCells() : element.elements();
    var array = children.toArray();
    if (GlobalEnv.EnableTableGroup && (element instanceof UIATableView)) {
        var groups = element.groups(); // this call takes 5 sec for tables without groups..
        if (groups) {
            array = array.concat(groups.toArray());
        }
    }
    if (!array) {
        array = []; // at least make it an object so we can cache
    }
    GlobalEnv.ChildrenArrayCache[elementText] = array;
    return array;
}

function bustChildArrayCache() {
    GlobalEnv.ChildrenArrayCache = {};
}

/** Get the debug text of an element
 */
function debugText(element) {
    var text = "[" + element.name() + "] " + element + " @ " + rect2str(element.rect());
    return text;
}

/** Mark the result as passed or failed in instruments
 */
function displayResult() {
    if (GlobalEnv.Pass) {
        UIALogger.logPass("⭑ Passed all tests ⭑");
    }
    else {
        if (GlobalEnv.CurrentFeature) {
            logFail("✘ " + GlobalEnv.CurrentFeature + " ✘");
        }
        else {
            logFail("✘ Test failed! ✘");
        }
    }
}

/// Safer than built-in logElementTree since this doesn't do recursion
function logChildren(element) {
    var array = childrenArray(element, false);
    for (var i in array) {
        var element = array[i];
        var prefix = inScreen(element)? "√ " : "X "
        log( prefix + debugText(element) );
    }
}

/// Safer than built-in logElementTree since this does recursion more conservatively
function logTree(element) {
    var stack = [element];
    var levelStack = [0];
    bustChildArrayCache();
    while (stack.length) {
        var current = stack.pop();
        var currentLevel = levelStack.pop();
        log("* " + Array(currentLevel).join("- ") + debugText(current));
        var children = childrenArray(current, true);
        for (var i in children.reverse()) {
            var child = children[i];
            if (inScreen(child) && !(child instanceof UIAApplication) ) {
                var childLevel = currentLevel + 1;
                levelStack.push(childLevel)
                stack.push(child);
            }
        }
    }
}

/** Swipe at a point to a direction
 * point is a dictionary with keys: x and y
 * direction is an instance of Direction enum
 */
function swipe(point, direction, distance, duration) {
    
    if (!distance) {
        distance = isPad() ? 300 : 100;
    }
    
    var humanFingerChubbiness = 5;
    var to = {};
    to.x = point.x;
    to.y = point.y;
    if (direction == Direction.Up) {
        to.y = to.y - distance;
        to.x = to.x + humanFingerChubbiness;
    }
    else if (direction == Direction.Down) {
        to.y = to.y + distance;
        to.x = to.x + humanFingerChubbiness;
    }
    else if (direction == Direction.Left) {
        to.x = to.x - distance;
        to.y = to.y + humanFingerChubbiness;
    }
    else if (direction == Direction.Right) {
        to.x = to.x + distance;
        to.y = to.y + humanFingerChubbiness;
    }

   
    
    if (!duration) {
        UIATarget.localTarget().flickFromTo(point, to);
    }
    else {
        UIATarget.localTarget().dragFromToForDuration(point, to, duration);
    }
    wait(2);
}



/// Find an element whose name contains str within element.
/// If allowCache is true, it might re-use the result at any level during the last childrenArray calls
function findChild(element, str, allowCache) {
    var splitIdx = str.indexOf("::");
    if (splitIdx>=0) {
        var items = str.split("::");
        var first = findChild(element, items[0], allowCache);
        if (!first) return null;
        return findChild(first, str.substring(splitIdx+2), allowCache);
    }

    var realtype = null;
    var realstr = str;

    var reg = /^\(\((.*)\)\)(.*)/;
    var rmatch = reg.exec(str);
    if (rmatch) {
        realtype = rmatch[1];
        realstr = rmatch[2];
    }

    var skipCount = 0;
    var reg2 = /(.*)\[\[(\d+)\]\]$/;
    var rmatch2 = reg2.exec(realstr);
    if (rmatch2) {
        realstr = rmatch2[1];
        skipCount = parseInt(rmatch2[2]);
    }

    var array = childrenArray(element, allowCache);
    for (var i in array) {
        var element = array[i];
        if (!inScreen(element)) {
            continue;
        }
        var match = true;
        if (realstr.length) {
            if (!element.name()) {
                match = false;
            }
            else if (element.name().indexOf(realstr)<0) {
                match = false;
            }
        }
        if (realtype) {
            var info = " "+element;
            if (info.indexOf(realtype)<0) {
                match = false;
            }
        }
        if (match) {
            if (skipCount>0) {
                skipCount --;
            }
            else {
                return element;
            }
        }
    }
    return null;
}

/// Current time in seconds
function currentTimeInSec() {
    return (new Date().getTime() / 1000);
}

/// Allowing a maximum waiting time, and check whether the target element appears
/// Returns the element if it exists.
function waitForElement(target, maxTime) {
    var window = win();
    var child = findChild(window, target);
    var timeStarted = currentTimeInSec();
    var timeSpent = 0;
    while(!child && timeSpent<maxTime) {
        wait(1);
        child = findChild(window, target);
        timeSpent = currentTimeInSec() - timeStarted;
    }
    return child;
}

/// Perform task based on task array
function performTask(tasks) {
    if (!GlobalEnv.Pass) {
        return;
    }
    GlobalEnv.CurrentFeature = null; // we are not in a feature unless Feature is called

    for (var i in tasks) {
        wait(1); // be tolerant at the beginning

        var step  = tasks[i];

        // Starting a Feature //
        if (step[0] == Feature) {
            if (GlobalEnv.CurrentFeature) {
                // conclude the previous feature if we are already in feature and now started a new feature
                displayResult();
            }
            logFeature(step[1]);
        }

        // Log a custom message //
        else if (step[0] == Note) {
            logNote(step[1]);
        }
        else {
            var missing = performStep(step);
            var stepName = step[0] + ": " + step.slice(1);
            if (!missing) {
                logStepPass(stepName);
            }
            else if (missing == NotMissingButStillFail) {
                logIssue(stepName);
                GlobalEnv.Pass = false;
                break;
            }
            else {
                logIssue("[error] cannot find or interact with "+ missing + " during step: " + stepName);
                logIssue("[failure investigation] current elements on screen");
                logTree(win());
                // throw "fail";
                GlobalEnv.Pass = false;
                break;
            }
        }
    }

    if (GlobalEnv.CurrentFeature || !GlobalEnv.Pass) {
        displayResult();
    }
}

function performStep(step) {
    var window = win();
    var action = step[0];
    var missing = null;
    var rescueIdx = -1;

    bustChildArrayCache();
    /**** Check *********************/
    if (Check == action) {
        waitForElement(step[1], GlobalEnv.DefaultMaxWaitingTime);
        for (var j in step) {
            if (j>0) {
                if (!findChild(window, step[j], true)) {
                    missing = step[j];
                    break;
                }
            }
        }
    }

    /**** CheckButtonEnabled *********************/
    else if (CheckButtonEnabled == action){
        waitForElement(step[1], GlobalEnv.DefaultMaxWaitingTime);
        var b = findChild(window, step[1]);
        if (!b) {
            missing = step[1];
        }
        else {
            if (b instanceof UIAButton) {
                var expected = step.length>=3 ? step[2] : true;
                if (expected == b.isEnabled()) {
                    return;
                }
                else {
                    // Test Failed
                    missing = NotMissingButStillFail;
                }
            }
            else {
                // for now we only check enabled state for UIButton. If it's not a button, we consider it as an error
                missing = step[1];
            }
        }
    }

    /**** Tap + TryTap *********************/
    else if (Tap == action || TryTap == action) {
        waitForElement(step[1], GlobalEnv.DefaultMaxWaitingTime);
        var b = findChild(window, step[1]);
        if (!b) {
            missing = step[1];
        }
        else {
            try {
                // log("going to tap " + b + b.name() + rect2str(b.rect()) );
                if (TryTap ==action) {
                    UIATarget.localTarget().tap(centerPoint(b.rect()));
                }
                else if (b instanceof UIAButton) {
                    b.tap();
                }
                else {
                    UIATarget.localTarget().tap(centerPoint(b.rect()));
                }
            }
            catch(ex) {
                missing = step[1];
            }
        }
        if (action== Tap) {
            rescueIdx = 2;
        }
        else { // TryTap
            if (missing) {
                logIssue("Failed to tap "+missing+" but it is fine");
            }
            missing = null; // it's fine
        }
    }

    /**** Investigate *********************/
    else if (Investigate == action) {
        if (step.length>1) {
            var e = findChild(window, step[1]);
            if (!e) {
                missing = step[1];
            }
            else {
                logTree(e);
            }
        }
        else {
            logTree(window);
        }
    }

    /**** Input *********************/
    else if (Input == action) {
        var kb = UIATarget.localTarget().frontMostApp().keyboard();
        if (kb) {
            kb.typeString(step[1]);
        }
        else {
            missing = "Keyboard";
            rescueIdx = 2;
        }
    }

    /**** Wait *********************/
    else if (Wait == action) {
        wait(step[1]);
    }

    /**** Scroll *********************/
    else if (Scroll == action) {
        var point = screenCenter();
        if (step[2]) {
            var element = findChild(window, step[2]);
            if (element) {
                point = centerPoint(element.rect());
            }
        }
        swipe(point, step[1], null, 1);
    }

    /**** Swipe *********************/
    else if (Swipe == action) {
        var point = screenCenter();
        if (step[2]) {
            var element = findChild(window, step[2]);
            if (element) {
                point = centerPoint(element.rect());
            }
        }
        swipe(point, step[1]);
    }

    /**** TapPoint *********************/
    else if (TapPoint == action) {
        UIATarget.localTarget().tap(step[1]);
    }

    /**** WaitFor *********************/
    else if (WaitFor == action) {
        var target = step[1];
        var maxTime = step[2];
        var child = waitForElement(target, maxTime);
        if (!child) {
            missing = target;
            rescueIdx = 3;
        }
    }

    /**** Pick *********************/
    else if (Pick == action) {
        waitForElement(step[1], GlobalEnv.DefaultMaxWaitingTime);
        var picker = findChild(window, step[1]);
        if (!picker || !(picker instanceof UIAPickerWheel) ) {
            missing = step[1];
        }
        else {
            try {
                picker.selectValue(step[2]);
            }
            catch(ex) {
                missing = step[2];
            }
        }
        rescueIdx = 3;
    }

    // see if we can rescue
    if (missing && rescueIdx && step[rescueIdx]) {
        rescueTask = step[rescueIdx];
        step.splice(rescueIdx,1);
        wait(1);
        log("rescuing with "+rescueTask);
        var rescueMissing = performStep(rescueTask);
        if (!rescueMissing) {
            wait(1);
            log("retrying "+step);
            missing = performStep(step);
        }
    }

    return missing;
}
