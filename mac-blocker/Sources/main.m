#import <Cocoa/Cocoa.h>
#import <CommonCrypto/CommonKeyDerivation.h>
#import <Security/Security.h>
#import <ServiceManagement/ServiceManagement.h>
#import <math.h>

static NSString * const KSPINService = @"com.kiddosprout.blocker.parent-pin";
static NSString * const KSBlockerBundleIdentifier = @"com.kiddosprout.blocker";
static NSString * const KSConfigFolder = @"KiddoSprout Blocker";
static NSString * const KSConfigFilename = @"config.json";
static const uint KSPBKDFRounds = 600000;
static const NSTimeInterval KSBlockedNoticeCooldown = 60.0;

typedef NS_ENUM(NSInteger, KSLoginItemAction) {
    KSLoginItemActionRegister,
    KSLoginItemActionUnregister,
    KSLoginItemActionOpenSystemSettings,
};

static KSLoginItemAction KSLoginItemActionForStatus(SMAppServiceStatus status) {
    switch (status) {
        case SMAppServiceStatusEnabled:
            return KSLoginItemActionUnregister;
        case SMAppServiceStatusRequiresApproval:
            return KSLoginItemActionOpenSystemSettings;
        case SMAppServiceStatusNotRegistered:
        case SMAppServiceStatusNotFound:
            return KSLoginItemActionRegister;
    }
    return KSLoginItemActionRegister;
}

static BOOL KSLoginItemMustBeUnregisteredBeforeRemoval(SMAppServiceStatus status) {
    return status == SMAppServiceStatusEnabled || status == SMAppServiceStatusRequiresApproval;
}

static BOOL KSUsesDarkAppearance(NSAppearance *appearance) {
    NSAppearanceName match = [appearance bestMatchFromAppearancesWithNames:@[
        NSAppearanceNameAqua,
        NSAppearanceNameDarkAqua
    ]];
    return [match isEqualToString:NSAppearanceNameDarkAqua];
}

static NSColor *KSStatusCardFillColor(void) {
    NSColor *dayColor = [NSColor colorWithRed:0.91 green:0.98 blue:0.96 alpha:1];
    NSColor *nightColor = [NSColor colorWithRed:0.04 green:0.19 blue:0.22 alpha:1];
    return [NSColor colorWithName:@"KiddoSproutStatusCardFill" dynamicProvider:^NSColor *(NSAppearance *appearance) {
        return KSUsesDarkAppearance(appearance) ? nightColor : dayColor;
    }];
}

static NSColor *KSStatusCardBorderColor(void) {
    NSColor *dayColor = [NSColor colorWithRed:0.13 green:0.55 blue:0.52 alpha:0.35];
    NSColor *nightColor = [NSColor colorWithRed:0.31 green:0.84 blue:0.76 alpha:0.72];
    return [NSColor colorWithName:@"KiddoSproutStatusCardBorder" dynamicProvider:^NSColor *(NSAppearance *appearance) {
        return KSUsesDarkAppearance(appearance) ? nightColor : dayColor;
    }];
}

static CGFloat KSColorLuminance(NSColor *color, NSAppearance *appearance) {
    __block CGFloat luminance = -1;
    [appearance performAsCurrentDrawingAppearance:^{
        NSColor *resolved = [color colorUsingColorSpace:NSColorSpace.sRGBColorSpace];
        if (!resolved) return;
        CGFloat red = 0, green = 0, blue = 0, alpha = 0;
        [resolved getRed:&red green:&green blue:&blue alpha:&alpha];
        luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    }];
    return luminance;
}

static NSString *KSPINNormalize(NSString *value) {
    if (![value isKindOfClass:NSString.class]) return @"";
    NSArray<NSString *> *parts = [value componentsSeparatedByCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    return [parts componentsJoinedByString:@""];
}

static BOOL KSPINIsValid(NSString *value) {
    value = KSPINNormalize(value);
    if (value.length < 4 || value.length > 8) return NO;
    for (NSUInteger index = 0; index < value.length; index += 1) {
        unichar character = [value characterAtIndex:index];
        if (character < '0' || character > '9') return NO;
    }
    return YES;
}

static NSString *KSPINFieldValue(NSTextField *field) {
    NSText *editor = field.currentEditor;
    return KSPINNormalize(editor ? editor.string : field.stringValue);
}

static NSString *KSAppVersion(void) {
    NSString *version = [NSBundle.mainBundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
    return [version isKindOfClass:NSString.class] ? version : @"";
}

static NSString *KSMetadataLowercase(NSString *value) {
    return [value isKindOfClass:NSString.class] ? value.lowercaseString : @"";
}

static NSString *KSNormalizedApplicationPath(NSString *value) {
    if (![value isKindOfClass:NSString.class] || !value.length) return @"";
    return value.stringByStandardizingPath.lowercaseString;
}

static BOOL KSBlockedRuleMatchesMetadata(NSDictionary *rule, NSString *bundleIdentifier, NSString *path) {
    if (![rule isKindOfClass:NSDictionary.class]) return NO;
    NSString *normalizedBundle = KSMetadataLowercase(bundleIdentifier);
    NSString *ruleBundle = KSMetadataLowercase(rule[@"bundleIdentifier"]);
    if (normalizedBundle.length && ruleBundle.length && [normalizedBundle isEqualToString:ruleBundle]) return YES;
    NSString *normalizedPath = KSNormalizedApplicationPath(path);
    NSString *rulePath = KSNormalizedApplicationPath(rule[@"path"]);
    return normalizedPath.length && rulePath.length && [normalizedPath isEqualToString:rulePath];
}

static NSString *KSBlockedApplicationIdentity(NSString *bundleIdentifier, NSString *path, NSString *name) {
    NSString *normalizedBundle = KSMetadataLowercase(bundleIdentifier);
    if (normalizedBundle.length) return [@"bundle:" stringByAppendingString:normalizedBundle];
    NSString *normalizedPath = KSNormalizedApplicationPath(path);
    if (normalizedPath.length) return [@"path:" stringByAppendingString:normalizedPath];
    NSString *normalizedName = KSMetadataLowercase(name);
    return normalizedName.length ? [@"name:" stringByAppendingString:normalizedName] : @"unknown";
}

static BOOL KSShouldShowBlockedNotice(NSMutableDictionary<NSString *, NSDate *> *lastNoticeDates,
                                      NSString *identity,
                                      NSDate *now,
                                      NSTimeInterval cooldown) {
    if (!lastNoticeDates || !identity.length || !now || cooldown <= 0) return YES;
    NSDate *lastNotice = lastNoticeDates[identity];
    NSTimeInterval elapsed = [lastNotice isKindOfClass:NSDate.class] ? [now timeIntervalSinceDate:lastNotice] : cooldown;
    if (elapsed >= 0 && elapsed < cooldown) return NO;
    if (lastNoticeDates.count >= 256) [lastNoticeDates removeAllObjects];
    lastNoticeDates[identity] = now;
    return YES;
}

static BOOL KSNumberIsIntegerInRange(id value, unsigned long long minimum, unsigned long long maximum) {
    if (![value isKindOfClass:NSNumber.class]) return NO;
    double numericValue = [(NSNumber *)value doubleValue];
    if (!isfinite(numericValue) || numericValue != floor(numericValue) || numericValue < (double)minimum || numericValue > (double)maximum) return NO;
    return [(NSNumber *)value unsignedLongLongValue] >= minimum && [(NSNumber *)value unsignedLongLongValue] <= maximum;
}

static BOOL KSStringContainsAny(NSString *value, NSArray<NSString *> *markers) {
    for (NSString *marker in markers) {
        if ([value containsString:marker]) return YES;
    }
    return NO;
}

static BOOL KSStringEqualsOrStartsWithAny(NSString *value, NSArray<NSString *> *markers) {
    for (NSString *marker in markers) {
        if ([value isEqualToString:marker] || [value hasPrefix:[marker stringByAppendingString:@" "]] || [value hasPrefix:[marker stringByAppendingString:@"-"]]) return YES;
    }
    return NO;
}

static BOOL KSApplicationMetadataIsEligible(NSString *path, NSString *bundleIdentifier) {
    NSString *normalizedPath = KSMetadataLowercase(path.stringByStandardizingPath);
    NSString *normalizedBundle = KSMetadataLowercase(bundleIdentifier);
    if (![normalizedPath.pathExtension isEqualToString:@"app"]) return NO;
    if ([normalizedBundle isEqualToString:KSBlockerBundleIdentifier]) return NO;
    NSArray<NSString *> *protectedRoots = @[@"/system/", @"/usr/", @"/bin/", @"/sbin/", @"/library/apple/"];
    for (NSString *root in protectedRoots) if ([normalizedPath hasPrefix:root]) return NO;
    return YES;
}

static BOOL KSMetadataIndicatesGame(NSString *category,
                                    NSString *bundleIdentifier,
                                    NSString *name,
                                    NSString *path) {
    NSString *normalizedCategory = KSMetadataLowercase(category);
    NSString *normalizedBundle = KSMetadataLowercase(bundleIdentifier);
    NSString *normalizedName = KSMetadataLowercase([name stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet]);
    NSString *normalizedPath = KSMetadataLowercase(path.stringByStandardizingPath);

    // Do not treat creation tools as games just because their name or install path mentions games.
    NSArray<NSString *> *developerToolMarkers = @[
        @"unreal editor", @"unity hub", @"gamemaker", @"game maker", @"godot",
        @"rpg maker", @"game porting toolkit", @"steamworks", @"/ue_"
    ];
    if (KSStringContainsAny(normalizedName, developerToolMarkers) || KSStringContainsAny(normalizedPath, developerToolMarkers)) return NO;
    if ([normalizedName isEqualToString:@"unity"] || [normalizedName isEqualToString:@"construct"]) return NO;

    // The App Store Games category is the strongest remaining signal supplied by macOS.
    if ([normalizedCategory containsString:@"app-category.games"] || [normalizedCategory hasSuffix:@".games"]) return YES;

    NSArray<NSString *> *knownBundleMarkers = @[
        @"com.valvesoftware.steam", @"com.epicgames.epicgameslauncher",
        @"com.riotgames.", @"com.blizzard.", @"net.battle.",
        @"com.electronicarts.origin", @"com.ea.origin", @"com.ea.app",
        @"com.roblox.", @"com.mojang.", @"net.minecraft.",
        @"com.gog.galaxy", @"com.nvidia.gfn", @"com.nvidia.geforcenow",
        @"com.microsoft.xbox", @"com.amazon.games", @"io.itch."
    ];
    if (KSStringContainsAny(normalizedBundle, knownBundleMarkers)) return YES;

    NSArray<NSString *> *gameLibraryPathMarkers = @[
        @"/steamapps/common/", @"/application support/steam/steamapps/",
        @"/applications/games/", @"/epic games/", @"/riot games/",
        @"/battle.net/", @"/blizzard/", @"/gog galaxy/", @"/minecraft/",
        @"/roblox/"
    ];
    if (KSStringContainsAny(normalizedPath, gameLibraryPathMarkers)) return YES;

    NSArray<NSString *> *knownNames = @[
        @"steam", @"steam helper", @"epic games launcher", @"battle.net",
        @"riot client", @"ea app", @"origin", @"gog galaxy", @"amazon games",
        @"geforce now", @"xbox", @"itch", @"heroic games launcher",
        @"roblox", @"robloxplayer", @"minecraft", @"minecraft launcher",
        @"fortnite", @"valorant", @"league of legends", @"dota 2",
        @"counter-strike 2", @"cs2", @"world of warcraft", @"overwatch",
        @"hearthstone", @"diablo", @"starcraft", @"the sims",
        @"rocket league", @"fall guys", @"among us"
    ];
    if (KSStringEqualsOrStartsWithAny(normalizedName, knownNames)) return YES;

    NSArray<NSString *> *bundleParts = [normalizedBundle componentsSeparatedByString:@"."];
    BOOL bundleCallsItAGame = [bundleParts containsObject:@"game"] || [bundleParts containsObject:@"games"] || [bundleParts containsObject:@"gaming"];
    BOOL nameCallsItAGame = [normalizedName isEqualToString:@"game"] || [normalizedName hasPrefix:@"game "] || [normalizedName hasSuffix:@" game"] ||
        [normalizedName containsString:@"game launcher"] || [normalizedName containsString:@"games launcher"];
    return bundleCallsItAGame || nameCallsItAGame;
}

static NSArray<NSDictionary *> *KSNormalizeBlockedApps(id value) {
    if (![value isKindOfClass:NSArray.class]) return @[];
    NSMutableArray<NSDictionary *> *result = [NSMutableArray array];
    NSMutableSet<NSString *> *seen = [NSMutableSet set];
    for (id candidate in (NSArray *)value) {
        if (![candidate isKindOfClass:NSDictionary.class]) continue;
        NSDictionary *item = candidate;
        NSString *name = [item[@"name"] isKindOfClass:NSString.class] ? item[@"name"] : @"";
        NSString *bundleIdentifier = [item[@"bundleIdentifier"] isKindOfClass:NSString.class] ? item[@"bundleIdentifier"] : @"";
        NSString *path = [item[@"path"] isKindOfClass:NSString.class] ? item[@"path"] : @"";
        if (!bundleIdentifier.length && !path.length) continue;
        if (!name.length) {
            name = path.lastPathComponent.stringByDeletingPathExtension;
            if (!name.length) name = bundleIdentifier;
        }
        NSString *identity = bundleIdentifier.length
            ? [@"bundle:" stringByAppendingString:bundleIdentifier.lowercaseString]
            : [@"path:" stringByAppendingString:path.stringByStandardizingPath.lowercaseString];
        if ([seen containsObject:identity]) continue;
        [seen addObject:identity];
        [result addObject:@{ @"name": name, @"bundleIdentifier": bundleIdentifier, @"path": path }];
        if (result.count >= 256) break;
    }
    return result;
}

static BOOL KSConfigBool(id value) {
    // JSON booleans arrive as NSNumber instances. Do not let malformed strings
    // such as "yes" or arbitrary non-zero numbers silently enable protection.
    return KSNumberIsIntegerInRange(value, 0, 1) && [(NSNumber *)value unsignedIntegerValue] == 1;
}

static BOOL KSProtectionShouldStart(BOOL configuredEnabled, BOOL hasValidPIN) {
    // Protection must never start in a state that a parent cannot unlock. A
    // missing or damaged Keychain record therefore fails open until a new PIN
    // is deliberately created and protection is started again.
    return configuredEnabled && hasValidPIN;
}

static BOOL KSShouldRestoreSettingsWindow(BOOL hasVisibleWindows) {
    return !hasVisibleWindows;
}

static BOOL KSRunningProcessPredatesCurrent(pid_t candidatePID,
                                            NSDate *candidateLaunchDate,
                                            pid_t currentPID,
                                            NSDate *currentLaunchDate) {
    if (candidatePID <= 0 || candidatePID == currentPID) return NO;
    if ([candidateLaunchDate isKindOfClass:NSDate.class] && [currentLaunchDate isKindOfClass:NSDate.class]) {
        NSComparisonResult comparison = [candidateLaunchDate compare:currentLaunchDate];
        if (comparison == NSOrderedAscending) return YES;
        if (comparison == NSOrderedDescending) return NO;
    }
    return candidatePID < currentPID;
}

static NSString *KSProcessIdentity(pid_t processIdentifier, NSDate *launchDate) {
    if ([launchDate isKindOfClass:NSDate.class]) {
        return [NSString stringWithFormat:@"%d:%.6f", processIdentifier, launchDate.timeIntervalSinceReferenceDate];
    }
    return [NSString stringWithFormat:@"%d", processIdentifier];
}

@interface KSPINFormatter : NSFormatter
@end

@implementation KSPINFormatter

- (NSString *)stringForObjectValue:(id)object {
    return [object isKindOfClass:NSString.class] ? object : [object description];
}

- (BOOL)getObjectValue:(id _Nullable __autoreleasing *)object
              forString:(NSString *)string
       errorDescription:(NSString * _Nullable __autoreleasing *)error {
    if (object) *object = KSPINNormalize(string);
    return YES;
}

- (BOOL)isPartialStringValid:(NSString *)partialString
            newEditingString:(NSString * _Nullable __autoreleasing *)newString
            errorDescription:(NSString * _Nullable __autoreleasing *)error {
    NSMutableString *digits = [NSMutableString string];
    NSCharacterSet *whitespace = NSCharacterSet.whitespaceAndNewlineCharacterSet;
    for (NSUInteger index = 0; index < partialString.length; index += 1) {
        unichar character = [partialString characterAtIndex:index];
        if (character >= '0' && character <= '9') {
            [digits appendFormat:@"%C", character];
        } else if (![whitespace characterIsMember:character]) {
            return NO;
        }
    }
    if (digits.length > 8) return NO;
    if (![digits isEqualToString:partialString]) {
        if (newString) *newString = digits;
        return NO;
    }
    return YES;
}

@end

static NSData *KSDerivePIN(NSString *pin, NSData *salt, uint rounds) {
    NSMutableData *derived = [NSMutableData dataWithLength:32];
    NSData *password = [pin dataUsingEncoding:NSUTF8StringEncoding];
    int result = CCKeyDerivationPBKDF(kCCPBKDF2,
                                      password.bytes,
                                      password.length,
                                      salt.bytes,
                                      salt.length,
                                      kCCPRFHmacAlgSHA256,
                                      rounds,
                                      derived.mutableBytes,
                                      derived.length);
    return result == 0 ? derived : nil;
}

static BOOL KSConstantTimeEqual(NSData *left, NSData *right) {
    if (!left || !right || left.length != right.length) return NO;
    const uint8_t *a = left.bytes;
    const uint8_t *b = right.bytes;
    uint8_t difference = 0;
    for (NSUInteger index = 0; index < left.length; index += 1) difference |= a[index] ^ b[index];
    return difference == 0;
}

static BOOL KSPINRecordIsStructurallyValid(NSDictionary *record) {
    if (![record isKindOfClass:NSDictionary.class] || !KSNumberIsIntegerInRange(record[@"version"], 1, 1)) return NO;
    if (!KSNumberIsIntegerInRange(record[@"rounds"], 10000, 5000000)) return NO;
    NSString *saltText = [record[@"salt"] isKindOfClass:NSString.class] ? record[@"salt"] : nil;
    NSString *hashText = [record[@"hash"] isKindOfClass:NSString.class] ? record[@"hash"] : nil;
    if (!saltText || !hashText) return NO;
    NSData *salt = [[NSData alloc] initWithBase64EncodedString:saltText options:0];
    NSData *hash = [[NSData alloc] initWithBase64EncodedString:hashText options:0];
    uint rounds = [record[@"rounds"] unsignedIntValue];
    return salt.length == 16 && hash.length == 32 && rounds >= 10000 && rounds <= 5000000;
}

@interface KSPINVault : NSObject
- (BOOL)hasPIN;
- (BOOL)setPIN:(NSString *)pin error:(NSError **)error;
- (BOOL)verifyPIN:(NSString *)pin;
- (void)clearPIN;
@end

@implementation KSPINVault

- (NSMutableDictionary *)baseQuery {
    return [@{
        (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService: KSPINService,
        (__bridge id)kSecAttrAccount: NSUserName()
    } mutableCopy];
}

- (NSData *)recordData {
    NSMutableDictionary *query = [self baseQuery];
    query[(__bridge id)kSecReturnData] = @YES;
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    CFTypeRef result = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
    return status == errSecSuccess ? CFBridgingRelease(result) : nil;
}

- (NSDictionary *)record {
    NSData *data = [self recordData];
    if (!data) return nil;
    id value = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    return [value isKindOfClass:NSDictionary.class] ? value : nil;
}

- (BOOL)hasPIN {
    return KSPINRecordIsStructurallyValid([self record]);
}

- (BOOL)setPIN:(NSString *)pin error:(NSError **)error {
    pin = KSPINNormalize(pin);
    if (!KSPINIsValid(pin)) {
        if (error) *error = [NSError errorWithDomain:@"KiddoSproutBlocker" code:1 userInfo:@{NSLocalizedDescriptionKey: @"Use 4–8 digits."}];
        return NO;
    }
    NSMutableData *salt = [NSMutableData dataWithLength:16];
    if (SecRandomCopyBytes(kSecRandomDefault, salt.length, salt.mutableBytes) != errSecSuccess) {
        if (error) *error = [NSError errorWithDomain:@"KiddoSproutBlocker" code:2 userInfo:@{NSLocalizedDescriptionKey: @"The Mac could not create a secure PIN salt."}];
        return NO;
    }
    NSData *hash = KSDerivePIN(pin, salt, KSPBKDFRounds);
    if (!hash) {
        if (error) *error = [NSError errorWithDomain:@"KiddoSproutBlocker" code:3 userInfo:@{NSLocalizedDescriptionKey: @"The parent PIN could not be protected."}];
        return NO;
    }
    NSDictionary *record = @{
        @"version": @1,
        @"rounds": @(KSPBKDFRounds),
        @"salt": [salt base64EncodedStringWithOptions:0],
        @"hash": [hash base64EncodedStringWithOptions:0]
    };
    NSData *recordData = [NSJSONSerialization dataWithJSONObject:record options:0 error:error];
    if (!recordData) return NO;
    NSMutableDictionary *query = [self baseQuery];
    OSStatus status;
    if ([self recordData]) {
        NSDictionary *attributes = @{ (__bridge id)kSecValueData: recordData };
        status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)attributes);
    } else {
        query[(__bridge id)kSecValueData] = recordData;
        query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
        status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
    }
    if (status != errSecSuccess && error) {
        *error = [NSError errorWithDomain:NSOSStatusErrorDomain code:status userInfo:@{NSLocalizedDescriptionKey: @"The parent PIN could not be saved in Keychain."}];
    }
    return status == errSecSuccess;
}

- (BOOL)verifyPIN:(NSString *)pin {
    pin = KSPINNormalize(pin);
    NSDictionary *record = [self record];
    if (!KSPINIsValid(pin) || !KSPINRecordIsStructurallyValid(record)) return NO;
    NSData *salt = [[NSData alloc] initWithBase64EncodedString:record[@"salt"] ?: @"" options:0];
    NSData *expected = [[NSData alloc] initWithBase64EncodedString:record[@"hash"] ?: @"" options:0];
    uint rounds = [record[@"rounds"] unsignedIntValue];
    return KSConstantTimeEqual(KSDerivePIN(pin, salt, rounds), expected);
}

- (void)clearPIN {
    SecItemDelete((__bridge CFDictionaryRef)[self baseQuery]);
}

@end

@interface KSConfigStore : NSObject
@property(nonatomic, readonly) NSURL *fileURL;
- (instancetype)initWithBaseURL:(NSURL *)baseURL;
- (NSDictionary *)load;
- (BOOL)save:(NSDictionary *)configuration error:(NSError **)error;
- (void)remove;
@end

@implementation KSConfigStore

- (instancetype)initWithBaseURL:(NSURL *)baseURL {
    self = [super init];
    if (self) {
        NSURL *folder = baseURL;
        if (!folder) {
            NSURL *support = [NSFileManager.defaultManager URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask].firstObject;
            folder = [support URLByAppendingPathComponent:KSConfigFolder isDirectory:YES];
        }
        _fileURL = [folder URLByAppendingPathComponent:KSConfigFilename];
    }
    return self;
}

- (NSDictionary *)defaultConfiguration {
    return @{ @"version": @1, @"enabled": @NO, @"blockedApps": @[] };
}

- (NSDictionary *)load {
    NSNumber *fileSize = nil;
    if ([self.fileURL getResourceValue:&fileSize forKey:NSURLFileSizeKey error:nil] && fileSize.unsignedLongLongValue > 64 * 1024) {
        return [self defaultConfiguration];
    }
    NSData *data = [NSData dataWithContentsOfURL:self.fileURL];
    if (!data) return [self defaultConfiguration];
    id value = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (![value isKindOfClass:NSDictionary.class]) return [self defaultConfiguration];
    NSDictionary *dictionary = value;
    if (!KSNumberIsIntegerInRange(dictionary[@"version"], 1, 1)) return [self defaultConfiguration];
    return @{
        @"version": @1,
        @"enabled": @(KSConfigBool(dictionary[@"enabled"])),
        @"blockedApps": KSNormalizeBlockedApps(dictionary[@"blockedApps"])
    };
}

- (BOOL)save:(NSDictionary *)configuration error:(NSError **)error {
    NSURL *folder = [self.fileURL URLByDeletingLastPathComponent];
    if (![NSFileManager.defaultManager createDirectoryAtURL:folder withIntermediateDirectories:YES attributes:@{NSFilePosixPermissions: @0700} error:error]) return NO;
    if (![NSFileManager.defaultManager setAttributes:@{NSFilePosixPermissions: @0700} ofItemAtPath:folder.path error:error]) return NO;
    NSData *data = [NSJSONSerialization dataWithJSONObject:configuration options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:error];
    if (!data || ![data writeToURL:self.fileURL options:NSDataWritingAtomic error:error]) return NO;
    if (![NSFileManager.defaultManager setAttributes:@{NSFilePosixPermissions: @0600} ofItemAtPath:self.fileURL.path error:error]) {
        [NSFileManager.defaultManager removeItemAtURL:self.fileURL error:nil];
        return NO;
    }
    return YES;
}

- (void)remove {
    [NSFileManager.defaultManager removeItemAtURL:[self.fileURL URLByDeletingLastPathComponent] error:nil];
}

@end

@interface KSBlockerController : NSObject <NSApplicationDelegate, NSTableViewDataSource, NSTableViewDelegate, NSWindowDelegate>
@property(nonatomic) NSWindow *window;
@property(nonatomic) NSStatusItem *statusItem;
@property(nonatomic) NSMenuItem *menuStatusItem;
@property(nonatomic) NSTextField *statusLabel;
@property(nonatomic) NSTextField *detailLabel;
@property(nonatomic) NSTextField *messageLabel;
@property(nonatomic) NSTableView *tableView;
@property(nonatomic) NSButton *pinButton;
@property(nonatomic) NSButton *toggleButton;
@property(nonatomic) NSButton *loginButton;
@property(nonatomic) NSMutableArray<NSDictionary *> *blockedApps;
@property(nonatomic) KSConfigStore *configStore;
@property(nonatomic) KSPINVault *pinVault;
@property(nonatomic) BOOL enabled;
@property(nonatomic) BOOL authorizedTermination;
@property(nonatomic) NSInteger failedPINAttempts;
@property(nonatomic) NSDate *pinLockoutUntil;
@property(nonatomic) id launchObserver;
@property(nonatomic) NSTimer *enforcementTimer;
@property(nonatomic) NSMutableSet<NSString *> *handledProcessIdentifiers;
@property(nonatomic) NSMutableDictionary<NSString *, NSDate *> *lastBlockedNoticeDates;
@property(nonatomic) BOOL blockedNoticeVisible;
@end

@implementation KSBlockerController

- (instancetype)init {
    self = [super init];
    if (self) {
        _configStore = [[KSConfigStore alloc] initWithBaseURL:nil];
        _pinVault = [KSPINVault new];
        NSDictionary *configuration = [_configStore load];
        _blockedApps = [NSMutableArray arrayWithArray:configuration[@"blockedApps"] ?: @[]];
        BOOL configuredEnabled = [configuration[@"enabled"] boolValue];
        BOOL hasValidPIN = [_pinVault hasPIN];
        _enabled = KSProtectionShouldStart(configuredEnabled, hasValidPIN);
        if (configuredEnabled && !_enabled) {
            NSDictionary *pausedConfiguration = @{ @"version": @1, @"enabled": @NO, @"blockedApps": _blockedApps.copy };
            [_configStore save:pausedConfiguration error:nil];
        }
        _handledProcessIdentifiers = [NSMutableSet set];
        _lastBlockedNoticeDates = [NSMutableDictionary dictionary];
    }
    return self;
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    NSRunningApplication *currentApplication = NSRunningApplication.currentApplication;
    for (NSRunningApplication *candidate in [NSRunningApplication runningApplicationsWithBundleIdentifier:KSBlockerBundleIdentifier]) {
        if (!KSRunningProcessPredatesCurrent(candidate.processIdentifier,
                                             candidate.launchDate,
                                             currentApplication.processIdentifier,
                                             currentApplication.launchDate)) continue;
        [candidate activateWithOptions:NSApplicationActivateIgnoringOtherApps];
        self.authorizedTermination = YES;
        [NSApp terminate:nil];
        return;
    }
    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [self buildWindow];
    [self buildStatusMenu];
    [self startMonitoring];
    [self refreshUI];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    if (![self.pinVault hasPIN]) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (NSApp.isActive) {
                [self setOrChangePIN:nil];
            } else {
                // AppKit turns an inactive modal prompt into a repeating
                // critical Dock bounce. Leave the visible Set Parent PIN
                // button available and use a single informational bounce.
                [NSApp requestUserAttention:NSInformationalRequest];
            }
        });
    }
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return NO;
}

- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)hasVisibleWindows {
    if (KSShouldRestoreSettingsWindow(hasVisibleWindows)) [self openSettings:nil];
    return YES;
}

- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication *)sender {
    if (self.authorizedTermination || ![self.pinVault hasPIN]) return NSTerminateNow;
    if ([self authenticateWithTitle:@"Quit KiddoSprout Blocker" message:@"Enter the parent PIN to stop protecting this Mac user."]) {
        self.authorizedTermination = YES;
        return NSTerminateNow;
    }
    return NSTerminateCancel;
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    if (self.launchObserver) [NSWorkspace.sharedWorkspace.notificationCenter removeObserver:self.launchObserver];
    [self.enforcementTimer invalidate];
}

- (NSTextField *)label:(NSString *)text size:(CGFloat)size weight:(NSFontWeight)weight color:(NSColor *)color {
    NSTextField *label = [NSTextField labelWithString:text ?: @""];
    label.font = [NSFont systemFontOfSize:size weight:weight];
    label.textColor = color;
    label.maximumNumberOfLines = 0;
    label.lineBreakMode = NSLineBreakByWordWrapping;
    return label;
}

- (NSButton *)button:(NSString *)title action:(SEL)action {
    NSButton *button = [NSButton buttonWithTitle:title target:self action:action];
    button.bezelStyle = NSBezelStyleRounded;
    button.controlSize = NSControlSizeLarge;
    return button;
}

- (void)buildWindow {
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 720, 590)
                                              styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    NSString *version = KSAppVersion();
    self.window.title = version.length
        ? [NSString stringWithFormat:@"KiddoSprout Blocker %@", version]
        : @"KiddoSprout Blocker";
    self.window.minSize = NSMakeSize(640, 520);
    self.window.delegate = self;
    [self.window center];

    NSView *content = self.window.contentView;
    NSStackView *stack = [NSStackView stackViewWithViews:@[]];
    stack.orientation = NSUserInterfaceLayoutOrientationVertical;
    stack.alignment = NSLayoutAttributeLeading;
    stack.spacing = 15;
    stack.translatesAutoresizingMaskIntoConstraints = NO;
    [content addSubview:stack];
    [NSLayoutConstraint activateConstraints:@[
        [stack.leadingAnchor constraintEqualToAnchor:content.leadingAnchor constant:26],
        [stack.trailingAnchor constraintEqualToAnchor:content.trailingAnchor constant:-26],
        [stack.topAnchor constraintEqualToAnchor:content.topAnchor constant:24],
        [stack.bottomAnchor constraintEqualToAnchor:content.bottomAnchor constant:-22]
    ]];

    NSTextField *title = [self label:@"KiddoSprout Game Blocker" size:28 weight:NSFontWeightBold color:NSColor.labelColor];
    NSTextField *subtitle = [self label:@"Detected games close automatically. Parents can also add any other app." size:14 weight:NSFontWeightRegular color:NSColor.secondaryLabelColor];
    [stack addArrangedSubview:title];
    [stack addArrangedSubview:subtitle];

    NSBox *statusBox = [NSBox new];
    statusBox.boxType = NSBoxCustom;
    statusBox.cornerRadius = 12;
    statusBox.borderWidth = 1;
    statusBox.borderColor = KSStatusCardBorderColor();
    statusBox.fillColor = KSStatusCardFillColor();
    statusBox.translatesAutoresizingMaskIntoConstraints = NO;
    [statusBox.heightAnchor constraintEqualToConstant:82].active = YES;
    NSStackView *statusStack = [NSStackView stackViewWithViews:@[]];
    statusStack.orientation = NSUserInterfaceLayoutOrientationVertical;
    statusStack.alignment = NSLayoutAttributeLeading;
    statusStack.spacing = 5;
    statusStack.translatesAutoresizingMaskIntoConstraints = NO;
    [statusBox.contentView addSubview:statusStack];
    [NSLayoutConstraint activateConstraints:@[
        [statusStack.leadingAnchor constraintEqualToAnchor:statusBox.contentView.leadingAnchor constant:16],
        [statusStack.trailingAnchor constraintEqualToAnchor:statusBox.contentView.trailingAnchor constant:-16],
        [statusStack.centerYAnchor constraintEqualToAnchor:statusBox.contentView.centerYAnchor]
    ]];
    self.statusLabel = [self label:@"Protection is paused" size:18 weight:NSFontWeightBold color:NSColor.labelColor];
    self.detailLabel = [self label:@"Set a parent PIN, add games, then start blocking." size:13 weight:NSFontWeightRegular color:NSColor.secondaryLabelColor];
    [statusStack addArrangedSubview:self.statusLabel];
    [statusStack addArrangedSubview:self.detailLabel];
    [stack addArrangedSubview:statusBox];
    [statusBox.widthAnchor constraintEqualToAnchor:stack.widthAnchor].active = YES;

    NSStackView *actions = [NSStackView stackViewWithViews:@[]];
    actions.orientation = NSUserInterfaceLayoutOrientationHorizontal;
    actions.spacing = 10;
    self.pinButton = [self button:@"Set Parent PIN" action:@selector(setOrChangePIN:)];
    [actions addArrangedSubview:self.pinButton];
    [actions addArrangedSubview:[self button:@"Add Game or App…" action:@selector(addApplications:)]];
    [actions addArrangedSubview:[self button:@"Find Installed Games" action:@selector(findInstalledGames:)]];
    [stack addArrangedSubview:actions];

    NSScrollView *scroll = [NSScrollView new];
    scroll.hasVerticalScroller = YES;
    scroll.borderType = NSBezelBorder;
    scroll.translatesAutoresizingMaskIntoConstraints = NO;
    [scroll.heightAnchor constraintGreaterThanOrEqualToConstant:225].active = YES;
    self.tableView = [NSTableView new];
    self.tableView.delegate = self;
    self.tableView.dataSource = self;
    self.tableView.rowHeight = 36;
    self.tableView.headerView = nil;
    NSTableColumn *appColumn = [[NSTableColumn alloc] initWithIdentifier:@"application"];
    appColumn.title = @"Blocked game or app";
    appColumn.width = 245;
    NSTableColumn *bundleColumn = [[NSTableColumn alloc] initWithIdentifier:@"bundle"];
    bundleColumn.title = @"Bundle identifier";
    bundleColumn.width = 380;
    [self.tableView addTableColumn:appColumn];
    [self.tableView addTableColumn:bundleColumn];
    self.tableView.doubleAction = @selector(removeSelectedApplication:);
    self.tableView.target = self;
    scroll.documentView = self.tableView;
    [stack addArrangedSubview:scroll];
    [scroll.widthAnchor constraintEqualToAnchor:stack.widthAnchor].active = YES;

    NSStackView *footer = [NSStackView stackViewWithViews:@[]];
    footer.orientation = NSUserInterfaceLayoutOrientationHorizontal;
    footer.spacing = 10;
    self.toggleButton = [self button:@"Start Blocking" action:@selector(toggleProtection:)];
    self.toggleButton.keyEquivalent = @"\r";
    self.loginButton = [self button:@"Start at Login" action:@selector(toggleLoginItem:)];
    [footer addArrangedSubview:self.toggleButton];
    [footer addArrangedSubview:self.loginButton];
    [footer addArrangedSubview:[self button:@"Remove Selected" action:@selector(removeSelectedApplication:)]];
    [footer addArrangedSubview:[self button:@"Remove Blocker…" action:@selector(removeBlocker:)]];
    [stack addArrangedSubview:footer];

    NSString *buildNote = version.length
        ? [NSString stringWithFormat:@"Version %@ test build: use a Standard child account. A Mac administrator can always force-remove software.", version]
        : @"Local test build: use a Standard child account. A Mac administrator can always force-remove software.";
    self.messageLabel = [self label:buildNote size:12 weight:NSFontWeightMedium color:NSColor.secondaryLabelColor];
    [stack addArrangedSubview:self.messageLabel];
    [self.messageLabel.widthAnchor constraintEqualToAnchor:stack.widthAnchor].active = YES;
}

- (void)buildStatusMenu {
    self.statusItem = [NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
    self.statusItem.button.image = [NSImage imageWithSystemSymbolName:@"shield.lefthalf.filled" accessibilityDescription:@"KiddoSprout Blocker"];
    NSMenu *menu = [NSMenu new];
    NSMenuItem *heading = [[NSMenuItem alloc] initWithTitle:@"KiddoSprout Blocker" action:nil keyEquivalent:@""];
    heading.enabled = NO;
    [menu addItem:heading];
    self.menuStatusItem = [[NSMenuItem alloc] initWithTitle:@"Protection is paused" action:nil keyEquivalent:@""];
    self.menuStatusItem.enabled = NO;
    [menu addItem:self.menuStatusItem];
    [menu addItem:NSMenuItem.separatorItem];
    [menu addItem:[[NSMenuItem alloc] initWithTitle:@"Open Settings" action:@selector(openSettings:) keyEquivalent:@","]];
    menu.itemArray.lastObject.target = self;
    [menu addItem:[[NSMenuItem alloc] initWithTitle:@"Start or Pause…" action:@selector(toggleProtection:) keyEquivalent:@""]];
    menu.itemArray.lastObject.target = self;
    [menu addItem:NSMenuItem.separatorItem];
    [menu addItem:[[NSMenuItem alloc] initWithTitle:@"Quit…" action:@selector(quitApplication:) keyEquivalent:@"q"]];
    menu.itemArray.lastObject.target = self;
    self.statusItem.menu = menu;
}

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tableView {
    return self.blockedApps.count;
}

- (NSView *)tableView:(NSTableView *)tableView viewForTableColumn:(NSTableColumn *)tableColumn row:(NSInteger)row {
    NSString *identifier = tableColumn.identifier;
    NSTextField *field = [tableView makeViewWithIdentifier:identifier owner:self];
    if (!field) {
        field = [NSTextField labelWithString:@""];
        field.identifier = identifier;
        field.lineBreakMode = NSLineBreakByTruncatingMiddle;
    }
    NSDictionary *app = self.blockedApps[row];
    field.stringValue = [identifier isEqualToString:@"application"] ? (app[@"name"] ?: @"Unknown app") : (app[@"bundleIdentifier"] ?: app[@"path"] ?: @"");
    return field;
}

- (BOOL)saveConfiguration {
    NSDictionary *configuration = @{ @"version": @1, @"enabled": @(self.enabled), @"blockedApps": self.blockedApps.copy };
    NSError *error = nil;
    if (![self.configStore save:configuration error:&error]) {
        self.messageLabel.stringValue = error.localizedDescription ?: @"Settings could not be saved.";
        return NO;
    }
    return YES;
}

- (NSString *)loginItemDescription {
    if (@available(macOS 13.0, *)) {
        switch (SMAppService.mainAppService.status) {
            case SMAppServiceStatusEnabled: return @"Runs at Login";
            case SMAppServiceStatusRequiresApproval: return @"Approve in Login Items";
            default: return @"Start at Login";
        }
    }
    return @"Start at Login unavailable";
}

- (void)refreshUI {
    BOOL hasPIN = [self.pinVault hasPIN];
    self.pinButton.title = hasPIN ? @"Change Parent PIN" : @"Set Parent PIN";
    self.toggleButton.title = self.enabled ? @"Pause Blocking" : @"Start Blocking";
    self.loginButton.title = [self loginItemDescription];
    if (!hasPIN) {
        self.statusLabel.stringValue = @"Parent PIN needed";
        self.detailLabel.stringValue = @"Create a 4–8 digit PIN before blocking games.";
    } else if (self.enabled) {
        self.statusLabel.stringValue = @"Protection is on";
        self.detailLabel.stringValue = [NSString stringWithFormat:@"Watching %@ for games plus %lu parent-selected %@.", NSUserName(), (unsigned long)self.blockedApps.count, self.blockedApps.count == 1 ? @"app" : @"apps"];
    } else {
        self.statusLabel.stringValue = @"Protection is paused";
        self.detailLabel.stringValue = @"Blocked apps can open until a parent starts protection.";
    }
    self.menuStatusItem.title = self.statusLabel.stringValue;
    self.statusItem.button.image = [NSImage imageWithSystemSymbolName:(self.enabled ? @"shield.fill" : @"shield.slash") accessibilityDescription:self.statusLabel.stringValue];
    [self.tableView reloadData];
}

- (void)openSettings:(id)sender {
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (void)quitApplication:(id)sender {
    [NSApp terminate:nil];
}

- (void)showAlertTitle:(NSString *)title message:(NSString *)message {
    NSAlert *alert = [NSAlert new];
    alert.messageText = title;
    alert.informativeText = message ?: @"";
    [alert addButtonWithTitle:@"OK"];
    [alert runModal];
}

- (NSString *)promptForNewPIN {
    while (YES) {
        NSAlert *alert = [NSAlert new];
        alert.messageText = @"Create a parent PIN";
        alert.informativeText = @"Choose 4–8 numbers. You will use this PIN to pause, change, quit, or remove the blocker.";
        [alert addButtonWithTitle:@"Save PIN"];
        [alert addButtonWithTitle:@"Cancel"];

        NSTextField *firstLabel = [NSTextField labelWithString:@"New PIN"];
        firstLabel.font = [NSFont systemFontOfSize:13 weight:NSFontWeightSemibold];
        NSSecureTextField *first = [NSSecureTextField new];
        first.placeholderString = @"Enter 4–8 digits";
        first.formatter = [KSPINFormatter new];
        first.accessibilityLabel = @"New parent PIN";

        NSTextField *secondLabel = [NSTextField labelWithString:@"Confirm PIN"];
        secondLabel.font = [NSFont systemFontOfSize:13 weight:NSFontWeightSemibold];
        NSSecureTextField *second = [NSSecureTextField new];
        second.placeholderString = @"Enter the same PIN again";
        second.formatter = [KSPINFormatter new];
        second.accessibilityLabel = @"Confirm parent PIN";

        NSStackView *fields = [NSStackView stackViewWithViews:@[firstLabel, first, secondLabel, second]];
        fields.orientation = NSUserInterfaceLayoutOrientationVertical;
        fields.alignment = NSLayoutAttributeLeading;
        fields.spacing = 6;
        fields.frame = NSMakeRect(0, 0, 320, 102);
        [NSLayoutConstraint activateConstraints:@[
            [first.widthAnchor constraintEqualToConstant:320],
            [second.widthAnchor constraintEqualToConstant:320],
            [first.heightAnchor constraintEqualToConstant:28],
            [second.heightAnchor constraintEqualToConstant:28]
        ]];
        alert.accessoryView = fields;
        [alert.window setInitialFirstResponder:first];
        if ([alert runModal] != NSAlertFirstButtonReturn) return nil;

        NSString *firstPIN = KSPINFieldValue(first);
        NSString *secondPIN = KSPINFieldValue(second);
        if (!KSPINIsValid(firstPIN) || !KSPINIsValid(secondPIN)) {
            [self showAlertTitle:@"Use 4–8 digits" message:@"Enter a PIN made from 4 to 8 numbers in both boxes."];
            continue;
        }
        if (![firstPIN isEqualToString:secondPIN]) {
            [self showAlertTitle:@"PINs do not match" message:@"Try again and enter the same numbers in both boxes."];
            continue;
        }
        return firstPIN;
    }
}

- (BOOL)authenticateWithTitle:(NSString *)title message:(NSString *)message {
    if (self.pinLockoutUntil && [self.pinLockoutUntil timeIntervalSinceNow] > 0) {
        NSInteger seconds = (NSInteger)ceil([self.pinLockoutUntil timeIntervalSinceNow]);
        [self showAlertTitle:@"Try again soon" message:[NSString stringWithFormat:@"Too many incorrect attempts. Wait %ld seconds.", (long)seconds]];
        return NO;
    }
    NSAlert *alert = [NSAlert new];
    alert.messageText = title;
    alert.informativeText = message ?: @"Enter the parent PIN to continue.";
    [alert addButtonWithTitle:@"Continue"];
    [alert addButtonWithTitle:@"Cancel"];
    NSSecureTextField *field = [NSSecureTextField new];
    field.placeholderString = @"Parent PIN";
    field.formatter = [KSPINFormatter new];
    field.accessibilityLabel = @"Parent PIN";
    field.frame = NSMakeRect(0, 0, 280, 26);
    alert.accessoryView = field;
    [alert.window setInitialFirstResponder:field];
    if ([alert runModal] != NSAlertFirstButtonReturn) return NO;
    if ([self.pinVault verifyPIN:KSPINFieldValue(field)]) {
        self.failedPINAttempts = 0;
        self.pinLockoutUntil = nil;
        return YES;
    }
    self.failedPINAttempts += 1;
    if (self.failedPINAttempts >= 3) {
        self.failedPINAttempts = 0;
        self.pinLockoutUntil = [NSDate dateWithTimeIntervalSinceNow:30];
        [self showAlertTitle:@"Temporarily locked" message:@"Too many incorrect PIN attempts. Try again in 30 seconds."];
    } else {
        [self showAlertTitle:@"Incorrect PIN" message:[NSString stringWithFormat:@"%ld %@ left before a short lock.", (long)(3 - self.failedPINAttempts), (3 - self.failedPINAttempts) == 1 ? @"try" : @"tries"]];
    }
    return NO;
}

- (void)setOrChangePIN:(id)sender {
    if ([self.pinVault hasPIN] && ![self authenticateWithTitle:@"Change Parent PIN" message:@"Enter the current PIN first."]) return;
    NSString *pin = [self promptForNewPIN];
    if (!pin) return;
    NSError *error = nil;
    if (![self.pinVault setPIN:pin error:&error]) {
        [self showAlertTitle:@"PIN not saved" message:error.localizedDescription ?: @"Try again."];
        return;
    }
    self.messageLabel.stringValue = @"Parent PIN saved securely in this Mac user’s Keychain.";
    [self refreshUI];
}

- (BOOL)isSafeApplicationURL:(NSURL *)url bundleIdentifier:(NSString *)bundleIdentifier {
    return url && KSApplicationMetadataIsEligible(url.path ?: @"", bundleIdentifier ?: @"");
}

- (void)addApplicationURL:(NSURL *)url {
    NSBundle *bundle = [NSBundle bundleWithURL:url];
    NSString *bundleIdentifier = bundle.bundleIdentifier ?: @"";
    if (![self isSafeApplicationURL:url bundleIdentifier:bundleIdentifier]) return;
    NSString *name = [NSFileManager.defaultManager displayNameAtPath:url.path];
    if ([name.pathExtension.lowercaseString isEqualToString:@"app"]) name = [name stringByDeletingPathExtension];
    BOOL exists = [self.blockedApps indexOfObjectPassingTest:^BOOL(NSDictionary *item, NSUInteger index, BOOL *stop) {
        return KSBlockedRuleMatchesMetadata(item, bundleIdentifier, url.path);
    }] != NSNotFound;
    if (!exists) [self.blockedApps addObject:@{ @"name": name ?: @"App", @"bundleIdentifier": bundleIdentifier, @"path": url.path ?: @"" }];
}

- (void)addApplications:(id)sender {
    if (![self.pinVault hasPIN]) { [self setOrChangePIN:nil]; return; }
    if (![self authenticateWithTitle:@"Add a blocked app" message:@"Enter the parent PIN, then choose any game or app outside macOS system folders."]) return;
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.title = @"Choose games or apps to block";
    panel.directoryURL = [NSURL fileURLWithPath:@"/Applications" isDirectory:YES];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = YES;
    if ([panel runModal] != NSModalResponseOK) return;
    NSArray<NSDictionary *> *previousApps = self.blockedApps.copy;
    for (NSURL *url in panel.URLs) [self addApplicationURL:url];
    if ([previousApps isEqualToArray:self.blockedApps]) return;
    if (![self saveConfiguration]) {
        self.blockedApps = [previousApps mutableCopy];
        [self refreshUI];
        [self showAlertTitle:@"Rules were not saved" message:self.messageLabel.stringValue];
        return;
    }
    [self refreshUI];
    if (self.enabled) [self enforceRunningApplications];
}

- (NSArray<NSURL *> *)installedGameCandidates {
    NSArray<NSURL *> *roots = @[
        [NSURL fileURLWithPath:@"/Applications" isDirectory:YES],
        [[NSURL fileURLWithPath:NSHomeDirectory() isDirectory:YES] URLByAppendingPathComponent:@"Applications" isDirectory:YES]
    ];
    NSMutableArray<NSURL *> *results = [NSMutableArray array];
    NSDirectoryEnumerationOptions options = NSDirectoryEnumerationSkipsHiddenFiles | NSDirectoryEnumerationSkipsPackageDescendants;
    for (NSURL *root in roots) {
        if (results.count >= 80) break;
        NSDirectoryEnumerator *enumerator = [NSFileManager.defaultManager enumeratorAtURL:root includingPropertiesForKeys:@[NSURLIsDirectoryKey] options:options errorHandler:nil];
        for (NSURL *url in enumerator) {
            if (![url.pathExtension.lowercaseString isEqualToString:@"app"]) continue;
            NSBundle *bundle = [NSBundle bundleWithURL:url];
            NSString *category = [bundle objectForInfoDictionaryKey:@"LSApplicationCategoryType"] ?: @"";
            NSString *name = url.lastPathComponent.stringByDeletingPathExtension;
            BOOL looksLikeGame = KSMetadataIndicatesGame(category, bundle.bundleIdentifier ?: @"", name, url.path ?: @"");
            if (looksLikeGame && [self isSafeApplicationURL:url bundleIdentifier:bundle.bundleIdentifier ?: @""]) [results addObject:url];
            [enumerator skipDescendants];
            if (results.count >= 80) break;
        }
    }
    return results;
}

- (void)findInstalledGames:(id)sender {
    if (![self.pinVault hasPIN]) { [self setOrChangePIN:nil]; return; }
    if (![self authenticateWithTitle:@"Find installed games" message:@"Enter the parent PIN to scan the Applications folders for likely games and launchers."]) return;
    NSArray<NSURL *> *games = [self installedGameCandidates];
    if (!games.count) {
        [self showAlertTitle:@"No obvious games found" message:@"Use Add Game or App to choose one manually."];
        return;
    }
    NSString *names = [[[games valueForKey:@"lastPathComponent"] valueForKey:@"stringByDeletingPathExtension"] componentsJoinedByString:@", "];
    NSAlert *alert = [NSAlert new];
    alert.messageText = [NSString stringWithFormat:@"Add %lu found %@?", (unsigned long)games.count, games.count == 1 ? @"game" : @"games"];
    alert.informativeText = [names length] > 500 ? [[names substringToIndex:500] stringByAppendingString:@"…"] : names;
    [alert addButtonWithTitle:@"Add Found Games"];
    [alert addButtonWithTitle:@"Cancel"];
    if ([alert runModal] != NSAlertFirstButtonReturn) return;
    NSArray<NSDictionary *> *previousApps = self.blockedApps.copy;
    for (NSURL *url in games) [self addApplicationURL:url];
    if ([previousApps isEqualToArray:self.blockedApps]) return;
    if (![self saveConfiguration]) {
        self.blockedApps = [previousApps mutableCopy];
        [self refreshUI];
        [self showAlertTitle:@"Rules were not saved" message:self.messageLabel.stringValue];
        return;
    }
    [self refreshUI];
}

- (void)removeSelectedApplication:(id)sender {
    NSInteger row = self.tableView.selectedRow;
    if (row < 0 || row >= (NSInteger)self.blockedApps.count) {
        [self showAlertTitle:@"Choose an app first" message:@"Select a game or app from the list, then choose Remove Selected."];
        return;
    }
    if (![self authenticateWithTitle:@"Remove blocked app" message:@"Enter the parent PIN to change this rule."]) return;
    NSDictionary *removedApplication = self.blockedApps[(NSUInteger)row];
    [self.blockedApps removeObjectAtIndex:(NSUInteger)row];
    if (![self saveConfiguration]) {
        [self.blockedApps insertObject:removedApplication atIndex:(NSUInteger)row];
        [self refreshUI];
        [self showAlertTitle:@"Rule was not removed" message:self.messageLabel.stringValue];
        return;
    }
    [self refreshUI];
}

- (void)toggleProtection:(id)sender {
    if (![self.pinVault hasPIN]) { [self setOrChangePIN:nil]; return; }
    if (self.enabled && ![self authenticateWithTitle:@"Pause protection" message:@"Enter the parent PIN to let blocked games open."]) return;
    BOOL previousEnabled = self.enabled;
    self.enabled = !self.enabled;
    if (![self saveConfiguration]) {
        self.enabled = previousEnabled;
        [self refreshUI];
        [self showAlertTitle:@"Protection did not change" message:self.messageLabel.stringValue];
        return;
    }
    [self.handledProcessIdentifiers removeAllObjects];
    [self refreshUI];
    self.messageLabel.stringValue = self.enabled ? @"Protection started for this signed-in Mac user." : @"Protection paused with the parent PIN.";
    if (self.enabled) [self enforceRunningApplications];
}

- (void)toggleLoginItem:(id)sender {
    if (![self.pinVault hasPIN]) { [self setOrChangePIN:nil]; return; }
    if (![self authenticateWithTitle:@"Change start-at-login" message:@"Enter the parent PIN to change background protection."]) return;
    if (@available(macOS 13.0, *)) {
        SMAppService *service = SMAppService.mainAppService;
        KSLoginItemAction action = KSLoginItemActionForStatus(service.status);
        if (action == KSLoginItemActionOpenSystemSettings) {
            [self showAlertTitle:@"Approve background protection" message:@"Turn on KiddoSprout Blocker in System Settings → General → Login Items."];
            [SMAppService openSystemSettingsLoginItems];
            [self refreshUI];
            return;
        }
        NSError *error = nil;
        BOOL success = NO;
        if (action == KSLoginItemActionUnregister) {
            success = [service unregisterAndReturnError:&error];
        } else {
            success = [service registerAndReturnError:&error];
        }
        if (!success) {
            [self showAlertTitle:@"Start-at-login could not change" message:error.localizedDescription ?: @"macOS did not change this Login Item."];
        } else if (service.status == SMAppServiceStatusRequiresApproval) {
            [self showAlertTitle:@"Approve background protection" message:@"Turn on KiddoSprout Blocker in System Settings → General → Login Items."];
            [SMAppService openSystemSettingsLoginItems];
        }
    }
    [self refreshUI];
}

- (void)removeBlocker:(id)sender {
    if ([self.pinVault hasPIN]) {
        if (![self authenticateWithTitle:@"Remove KiddoSprout Blocker" message:@"Enter the parent PIN. macOS may also require the administrator password."]) return;
    } else {
        NSAlert *confirmation = [NSAlert new];
        confirmation.messageText = @"Remove KiddoSprout Blocker?";
        confirmation.informativeText = @"No valid parent PIN is set. Remove this unconfigured copy from the Mac?";
        [confirmation addButtonWithTitle:@"Remove Blocker"];
        [confirmation addButtonWithTitle:@"Cancel"];
        if ([confirmation runModal] != NSAlertFirstButtonReturn) return;
    }
    NSURL *bundleURL = NSBundle.mainBundle.bundleURL;
    __block BOOL loginItemWasUnregistered = NO;
    if (@available(macOS 13.0, *)) {
        SMAppService *service = SMAppService.mainAppService;
        if (KSLoginItemMustBeUnregisteredBeforeRemoval(service.status)) {
            NSError *loginItemError = nil;
            if (![service unregisterAndReturnError:&loginItemError]) {
                [self showAlertTitle:@"Remove start-at-login first"
                             message:loginItemError.localizedDescription ?: @"macOS could not remove the KiddoSprout Login Item, so the app was left installed."];
                return;
            }
            loginItemWasUnregistered = YES;
        }
    }
    [NSWorkspace.sharedWorkspace recycleURLs:@[bundleURL] completionHandler:^(NSDictionary<NSURL *, NSURL *> *newURLs, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                NSString *message = @"Move KiddoSprout Blocker from Applications to the Bin using the parent administrator account.";
                if (loginItemWasUnregistered) {
                    if (@available(macOS 13.0, *)) {
                        NSError *restoreError = nil;
                        BOOL restored = [SMAppService.mainAppService registerAndReturnError:&restoreError];
                        if (restored) {
                            message = [message stringByAppendingString:@" Start at Login was restored because removal failed."];
                        } else {
                            NSString *detail = restoreError.localizedDescription ?: @"macOS did not restore the Login Item.";
                            message = [message stringByAppendingFormat:@" Start at Login also needs attention: %@", detail];
                        }
                    }
                }
                [self showAlertTitle:@"macOS did not remove the app" message:message];
                [self refreshUI];
                return;
            }
            [self.pinVault clearPIN];
            [self.configStore remove];
            self.authorizedTermination = YES;
            [NSApp terminate:nil];
        });
    }];
}

- (void)startMonitoring {
    __weak typeof(self) weakSelf = self;
    self.launchObserver = [NSWorkspace.sharedWorkspace.notificationCenter addObserverForName:NSWorkspaceDidLaunchApplicationNotification object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) {
        NSRunningApplication *application = note.userInfo[NSWorkspaceApplicationKey];
        [weakSelf enforceApplication:application];
    }];
    self.enforcementTimer = [NSTimer scheduledTimerWithTimeInterval:2.0 target:self selector:@selector(enforceRunningApplications) userInfo:nil repeats:YES];
    if (self.enabled) [self enforceRunningApplications];
}

- (BOOL)applicationIsBlocked:(NSRunningApplication *)application {
    if (!application || application.processIdentifier == NSRunningApplication.currentApplication.processIdentifier) return NO;
    NSString *bundleIdentifier = application.bundleIdentifier ?: @"";
    NSString *path = application.bundleURL.path ?: @"";
    if (![self isSafeApplicationURL:application.bundleURL bundleIdentifier:bundleIdentifier]) return NO;
    BOOL manuallyBlocked = [self.blockedApps indexOfObjectPassingTest:^BOOL(NSDictionary *item, NSUInteger index, BOOL *stop) {
        return KSBlockedRuleMatchesMetadata(item, bundleIdentifier, path);
    }] != NSNotFound;
    if (manuallyBlocked) return YES;
    NSBundle *bundle = [NSBundle bundleWithURL:application.bundleURL];
    NSString *category = [bundle objectForInfoDictionaryKey:@"LSApplicationCategoryType"] ?: @"";
    NSString *name = application.localizedName ?: [bundle objectForInfoDictionaryKey:@"CFBundleDisplayName"] ?: application.bundleURL.lastPathComponent.stringByDeletingPathExtension;
    return KSMetadataIndicatesGame(category, bundleIdentifier, name ?: @"", path);
}

- (void)showApplicationNoticeTitle:(NSString *)title message:(NSString *)message {
    self.messageLabel.stringValue = title;
    // A second detection can arrive while the first alert is still visible.
    // Update the in-window status, but do not reactivate the app or request
    // attention again; repeated activation was perceived as Dock bouncing.
    if (self.blockedNoticeVisible || self.window.attachedSheet) return;
    self.blockedNoticeVisible = YES;
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
    __weak typeof(self) weakSelf = self;
    // Activation completes on the next AppKit turn. Presenting a modal sheet
    // while still inactive makes AppKit create a critical attention request,
    // which bounces the Dock icon until somebody clicks it. If activation is
    // denied, keep the in-window status and ask for one informational bounce.
    dispatch_async(dispatch_get_main_queue(), ^{
        typeof(self) strongSelf = weakSelf;
        if (!strongSelf) return;
        if (!NSApp.isActive) {
            [NSApp requestUserAttention:NSInformationalRequest];
            strongSelf.blockedNoticeVisible = NO;
            return;
        }
        NSAlert *alert = [NSAlert new];
        alert.messageText = title;
        alert.informativeText = message;
        [alert addButtonWithTitle:@"OK"];
        [alert beginSheetModalForWindow:strongSelf.window completionHandler:^(NSModalResponse returnCode) {
            strongSelf.blockedNoticeVisible = NO;
        }];
    });
}

- (void)showBlockedApplicationNotice:(NSString *)name {
    NSString *displayName = name.length ? name : @"This game";
    [self showApplicationNoticeTitle:@"Blocked this app."
                             message:[NSString stringWithFormat:@"KiddoSprout closed %@ because game protection is on.", displayName]];
}

- (void)showBlockFailureNotice:(NSString *)name {
    NSString *displayName = name.length ? name : @"this app";
    [self showApplicationNoticeTitle:@"Could not block this app"
                             message:[NSString stringWithFormat:@"macOS did not confirm that %@ closed. Close it manually and check that KiddoSprout is running in the same signed-in Mac user.", displayName]];
}

- (void)enforceApplication:(NSRunningApplication *)application {
    if (!self.enabled || ![self applicationIsBlocked:application]) return;
    NSString *processIdentity = KSProcessIdentity(application.processIdentifier, application.launchDate);
    if ([self.handledProcessIdentifiers containsObject:processIdentity]) return;
    [self.handledProcessIdentifiers addObject:processIdentity];
    NSString *name = application.localizedName ?: @"A blocked app";
    NSString *noticeIdentity = KSBlockedApplicationIdentity(application.bundleIdentifier ?: @"", application.bundleURL.path ?: @"", name);
    BOOL requested = [application terminate];
    if (!requested) [application forceTerminate];
    __weak typeof(self) weakSelf = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.35 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        typeof(self) strongSelf = weakSelf;
        if (!strongSelf) return;
        if (!application.terminated && (!strongSelf.enabled || ![strongSelf applicationIsBlocked:application])) {
            [strongSelf.handledProcessIdentifiers removeObject:processIdentity];
            return;
        }
        if (!application.terminated) [application forceTerminate];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.45 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            typeof(self) strongSelf = weakSelf;
            if (!strongSelf) return;
            if (!strongSelf.enabled) {
                [strongSelf.handledProcessIdentifiers removeObject:processIdentity];
                return;
            }
            BOOL shouldShowNotice = KSShouldShowBlockedNotice(strongSelf.lastBlockedNoticeDates, noticeIdentity, NSDate.date, KSBlockedNoticeCooldown);
            if (application.terminated) {
                if (shouldShowNotice) {
                    [strongSelf showBlockedApplicationNotice:name];
                    NSBeep();
                } else {
                    strongSelf.messageLabel.stringValue = [NSString stringWithFormat:@"Blocked %@ again; the repeat alert was silenced.", name];
                }
            } else if (shouldShowNotice) {
                [strongSelf showBlockFailureNotice:name];
            } else {
                strongSelf.messageLabel.stringValue = [NSString stringWithFormat:@"Could not confirm that %@ closed.", name];
            }
            NSTimeInterval handledCooldown = application.terminated ? 30.0 : 5.0;
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(handledCooldown * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [weakSelf.handledProcessIdentifiers removeObject:processIdentity];
            });
        });
    });
}

- (void)enforceRunningApplications {
    if (!self.enabled) return;
    for (NSRunningApplication *application in NSWorkspace.sharedWorkspace.runningApplications) [self enforceApplication:application];
}

@end

static int KSRunSelfTest(void) {
    NSData *salt = [@"0123456789abcdef" dataUsingEncoding:NSUTF8StringEncoding];
    NSData *first = KSDerivePIN(@"2468", salt, 12000);
    NSData *second = KSDerivePIN(@"2468", salt, 12000);
    NSData *wrong = KSDerivePIN(@"1357", salt, 12000);
    NSString *temporary = [NSTemporaryDirectory() stringByAppendingPathComponent:[NSString stringWithFormat:@"kiddosprout-blocker-test-%@", NSUUID.UUID.UUIDString]];
    KSConfigStore *store = [[KSConfigStore alloc] initWithBaseURL:[NSURL fileURLWithPath:temporary isDirectory:YES]];
    NSError *error = nil;
    NSDictionary *fixture = @{
        @"version": @1,
        @"enabled": @YES,
        @"blockedApps": @[
            @{ @"name": @"Test Game", @"bundleIdentifier": @"example.test.game", @"path": @"/Applications/Test Game.app" },
            @{ @"name": @"Duplicate Test Game", @"bundleIdentifier": @"example.test.game", @"path": @"/Applications/Test Game Copy.app" },
            @"invalid old rule",
            NSNull.null,
            @{ @"name": @42, @"bundleIdentifier": NSNull.null, @"path": NSNull.null }
        ]
    };
    BOOL saved = [store save:fixture error:&error];
    NSDictionary *loaded = [store load];
    BOOL normalizationPassed = [KSPINNormalize(@" 24 68\n") isEqualToString:@"2468"] && KSPINIsValid(@" 24 68 ");
    BOOL validationPassed = KSPINIsValid(@"2468") && !KSPINIsValid(@"12a4") && !KSPINIsValid(@"١٢٣٤") && !KSPINIsValid(@"123") && !KSPINIsValid(@"123456789");
    NSDictionary *validPINRecord = @{
        @"version": @1,
        @"rounds": @12000,
        @"salt": [salt base64EncodedStringWithOptions:0],
        @"hash": [first base64EncodedStringWithOptions:0]
    };
    BOOL pinRecordValidationPassed = KSPINRecordIsStructurallyValid(validPINRecord) &&
        !KSPINRecordIsStructurallyValid(@{ @"version": @1, @"rounds": @999999999, @"salt": @"bad", @"hash": @"bad" }) &&
        !KSPINRecordIsStructurallyValid(@{ @"version": @[@1], @"rounds": @12000, @"salt": @[ @"bad" ], @"hash": @"bad" });
    BOOL gameDetectionPassed =
        KSMetadataIndicatesGame(@"public.app-category.games", @"com.example.chess", @"Chess", @"/Applications/Chess.app") &&
        KSMetadataIndicatesGame(@"", @"com.valvesoftware.steam", @"Steam", @"/Applications/Steam.app") &&
        KSMetadataIndicatesGame(@"", @"com.example.title", @"Space Game", @"/Applications/Space Game.app") &&
        !KSMetadataIndicatesGame(@"public.app-category.productivity", @"com.apple.Pages", @"Pages", @"/Applications/Pages.app") &&
        !KSMetadataIndicatesGame(@"", @"com.unity3d.UnityHub", @"Unity Hub", @"/Applications/Unity Hub.app") &&
        !KSMetadataIndicatesGame(@"public.app-category.games", @"com.unity3d.UnityHub", @"Unity Hub", @"/Applications/Unity Hub.app");
    NSAppearance *dayAppearance = [NSAppearance appearanceNamed:NSAppearanceNameAqua];
    NSAppearance *nightAppearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    CGFloat dayStatusLuminance = KSColorLuminance(KSStatusCardFillColor(), dayAppearance);
    CGFloat nightStatusLuminance = KSColorLuminance(KSStatusCardFillColor(), nightAppearance);
    BOOL statusThemeColorsPassed = dayStatusLuminance > 0.80 && nightStatusLuminance >= 0 && nightStatusLuminance < 0.30;
    BOOL loginItemStateRoutingPassed =
        KSLoginItemActionForStatus(SMAppServiceStatusNotRegistered) == KSLoginItemActionRegister &&
        KSLoginItemActionForStatus(SMAppServiceStatusNotFound) == KSLoginItemActionRegister &&
        KSLoginItemActionForStatus(SMAppServiceStatusEnabled) == KSLoginItemActionUnregister &&
        KSLoginItemActionForStatus(SMAppServiceStatusRequiresApproval) == KSLoginItemActionOpenSystemSettings;
    BOOL loginItemRemovalRoutingPassed =
        !KSLoginItemMustBeUnregisteredBeforeRemoval(SMAppServiceStatusNotRegistered) &&
        !KSLoginItemMustBeUnregisteredBeforeRemoval(SMAppServiceStatusNotFound) &&
        KSLoginItemMustBeUnregisteredBeforeRemoval(SMAppServiceStatusEnabled) &&
        KSLoginItemMustBeUnregisteredBeforeRemoval(SMAppServiceStatusRequiresApproval);
    BOOL configSanitizationPassed = saved && [loaded[@"enabled"] boolValue] && [loaded[@"blockedApps"] count] == 1 && [loaded[@"blockedApps"][0][@"name"] isEqualToString:@"Test Game"] &&
        KSConfigBool(@YES) && !KSConfigBool(@NO) && !KSConfigBool(@2) && !KSConfigBool(@"yes") && !KSConfigBool(NSNull.null);
    NSDictionary *savedAttributes = [NSFileManager.defaultManager attributesOfItemAtPath:store.fileURL.path error:nil];
    BOOL configPermissionsPassed = ([savedAttributes[NSFilePosixPermissions] unsignedIntegerValue] & 0777) == 0600;
    NSDictionary *caseInsensitiveRule = @{ @"bundleIdentifier": @"COM.Example.Game", @"path": @"/Applications/Test Game.app" };
    BOOL ruleMatchingPassed = KSBlockedRuleMatchesMetadata(caseInsensitiveRule, @"com.example.game", @"") &&
        KSBlockedRuleMatchesMetadata(caseInsensitiveRule, @"", @"/applications/test game.app") &&
        !KSBlockedRuleMatchesMetadata(caseInsensitiveRule, @"com.example.other", @"/Applications/Other.app");
    NSMutableDictionary<NSString *, NSDate *> *noticeDates = [NSMutableDictionary dictionary];
    NSDate *noticeStart = [NSDate dateWithTimeIntervalSince1970:1000];
    BOOL noticeCooldownPassed = KSShouldShowBlockedNotice(noticeDates, @"bundle:com.example.game", noticeStart, 60) &&
        !KSShouldShowBlockedNotice(noticeDates, @"bundle:com.example.game", [noticeStart dateByAddingTimeInterval:30], 60) &&
        KSShouldShowBlockedNotice(noticeDates, @"bundle:com.example.game", [noticeStart dateByAddingTimeInterval:61], 60);
    BOOL windowReopenRoutingPassed = KSShouldRestoreSettingsWindow(NO) && !KSShouldRestoreSettingsWindow(YES);
    BOOL protectionStartRoutingPassed = KSProtectionShouldStart(YES, YES) && !KSProtectionShouldStart(YES, NO) && !KSProtectionShouldStart(NO, YES);
    NSDate *olderLaunch = [NSDate dateWithTimeIntervalSince1970:1000];
    NSDate *newerLaunch = [NSDate dateWithTimeIntervalSince1970:1001];
    BOOL singleInstanceRoutingPassed = KSRunningProcessPredatesCurrent(10, olderLaunch, 20, newerLaunch) &&
        !KSRunningProcessPredatesCurrent(20, newerLaunch, 10, olderLaunch) &&
        !KSRunningProcessPredatesCurrent(20, newerLaunch, 20, newerLaunch);
    BOOL processIdentityPassed = ![KSProcessIdentity(42, olderLaunch) isEqualToString:KSProcessIdentity(42, newerLaunch)] &&
        [KSProcessIdentity(42, nil) isEqualToString:@"42"];
    BOOL passed = normalizationPassed && validationPassed && pinRecordValidationPassed && gameDetectionPassed && statusThemeColorsPassed && loginItemStateRoutingPassed && loginItemRemovalRoutingPassed && configSanitizationPassed && configPermissionsPassed && ruleMatchingPassed && noticeCooldownPassed && windowReopenRoutingPassed && protectionStartRoutingPassed && singleInstanceRoutingPassed && processIdentityPassed && KSConstantTimeEqual(first, second) && !KSConstantTimeEqual(first, wrong);
    [store remove];
    NSDictionary *report = @{ @"passed": @(passed), @"pinValidation": @(validationPassed), @"pinRecordValidation": @(pinRecordValidationPassed), @"pinNormalization": @(normalizationPassed), @"pinDerivation": @(KSConstantTimeEqual(first, second)), @"gameDetection": @(gameDetectionPassed), @"statusThemeColors": @(statusThemeColorsPassed), @"loginItemStateRouting": @(loginItemStateRoutingPassed), @"loginItemRemovalRouting": @(loginItemRemovalRoutingPassed), @"configSanitization": @(configSanitizationPassed), @"configPermissions": @(configPermissionsPassed), @"ruleMatching": @(ruleMatchingPassed), @"noticeCooldown": @(noticeCooldownPassed), @"windowReopenRouting": @(windowReopenRoutingPassed), @"protectionStartRouting": @(protectionStartRoutingPassed), @"singleInstanceRouting": @(singleInstanceRoutingPassed), @"processIdentity": @(processIdentityPassed), @"configRoundTrip": @(saved && [loaded[@"blockedApps"] count] == 1), @"error": error.localizedDescription ?: @"" };
    NSData *json = [NSJSONSerialization dataWithJSONObject:report options:NSJSONWritingPrettyPrinted | NSJSONWritingSortedKeys error:nil];
    fwrite(json.bytes, 1, json.length, stdout);
    fputc('\n', stdout);
    return passed ? 0 : 1;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        for (int index = 1; index < argc; index += 1) if (strcmp(argv[index], "--self-test") == 0) return KSRunSelfTest();
        NSApplication *application = NSApplication.sharedApplication;
        KSBlockerController *controller = [KSBlockerController new];
        application.delegate = controller;
        [application run];
    }
    return 0;
}
