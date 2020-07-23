# Change Log
All notable changes to this project will be documented in this file

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

##
### Added
 - Fetch library to replace request.js.

### Fixed
 - Access query fixed to work with elemMatch.

## 0.6.6
### Fixed
 - Access role tests causing crashes.

## 0.6.5
### Fixed
 - Access roles being removed if not strings.

## 0.6.4
### Added
 - Field based resource access.
 - Self access.

## 0.6.3
### Fixed
 - Roles not actually being converted correctly.

## 0.6.2
### Fixed
 - Few regex and other fixes for tests.

## 0.6.1
### Fixed
 - Several queries didn't pass params correctly.

## 0.6.0
### Added
 - Export endpoint for forms
 
### Changed
 - Upgrade formio.js to 4.10.0-beta.20

## 0.5.2
### Fixed
 - Many bug fixes and refactors to pass form tests.

## 0.5.1
### Fixed
 - Many bug fixes and refactors to pass form tests.

## 0.5.0
### Fixed
 - Many bug fixes and refactors to pass form tests.

## 0.4.5
### Fixed
 - Fix some schema types that are complex arrays.

## 0.4.4
### Fixed
 - bcrypt throwing error for undefined value.

## 0.4.3
### Fixed
 - Login action returning the wrong results.
 - Current not checking access to deny anonymous.
 - Fixes to entity permissions roles.
 - Fixed Permission checks for submissions
 - Fixed new submissions not having owner if created by anonymous during registration.
 - Fixed created and modified persistance.

## 0.4.2
### Fixed
 - Save as reference to save and load correctly.

## 0.4.1
### Changed
 - Make finalize async.

## 0.4.0
### Added
 - Evaluator overrides to ensure everything is sandboxed
 - A way to override field and property actions.

## 0.3.9
### Fixed
 - Actions Resource had order of parameters incorrect.

## 0.3.8
### Fixed
 - Stop double encrypting passwords when saving to resource
 
### Changed
 - Use load entities for actions.

## 0.3.7
### Changed
 - Unify load entities so it can be overridden.

## 0.3.6
### Fixed
 - Isomorphic validator in formio.js expects model to be different signature.
 - Creation of default actions.

## 0.3.5
### Fixed
 - Signature of delete in model class.

## 0.3.4
### Changed
 - isomorphic validator from formio.js

### Added
 - Support for executing actions from context.

### Fixed
 - Location of schema on model which caused some queries to fail.

## 0.3.3
### Added
 - Save as reference.
 
### Fixed
 - Support for multiple databases.

## 0.3.2
### Added
 - Save to submission.

## 0.3.1
### Fixed
 - Numerous bugs and improvements.

## 0.3.0
### Changed
 - Converted to typescript.
 - Many bug fixes and syntax updates.

## 0.2.2
### Added
 - Preliminary support for save to resource.

## 0.2.1
### Changed
 - Fix actions export location.

## 0.2.0
### Changed
 - Refactor to clean up lots of classes.

## 0.1.0
Initial release
