//
//  LGRSliderViewControllerTest.m
//  Liger
//
//  Created by John Gustafsson on 11/25/13.
//  Copyright (c) 2013-2014 ReachLocal Inc. All rights reserved.  https://github.com/reachlocal/liger-ios/blob/master/LICENSE
//

@import XCTest;
#import "LGRSlideViewController.h"

@interface LGRSlideViewControllerTest : XCTestCase
@end

@implementation LGRSlideViewControllerTest

- (void)setUp
{
    [super setUp];
}

- (void)tearDown
{
    // Put teardown code here; it will be run once, after the last test case.
    [super tearDown];
}

- (void)testResetApp
{
	LGRSlideViewController *slider = [[LGRSlideViewController alloc] initWithNibName:@"LGRSlideViewController" bundle:nil];
	XCTAssert(slider.view, @"Slider has no view");
	[slider resetApp];
	[slider.childViewControllers[0] viewDidAppear:NO]; // We have to fake calling this as slider's view isn't hooked up to anything

	XCTAssert(slider.childViewControllers.count == 2, @"Wrong number of child controllers.");
}

@end
