import 'ace-builds/esm-resolver'

import cssText from '@crafton/assets/styles/ace.css?raw'
import ace from 'ace-builds'

ace['define'](
	'ace/theme/crafton',
	['require', 'exports', 'module', 'ace/lib/dom'],
	function (require, exports, _module) {
		exports.isDark = false
		exports.cssClass = 'ace-crafton'
		exports.cssText = cssText

		const dom = require('ace/lib/dom')
		dom.importCssString(exports.cssText, exports.cssClass, false)
	},
)
