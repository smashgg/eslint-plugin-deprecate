'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var makeImportObj = function makeImportObj(importName) {
    if (typeof importName === 'string') {
        return { name: importName };
    }
    if ((typeof importName === 'undefined' ? 'undefined' : _typeof(importName)) === 'object' && importName.name && importName.use) {
        return importName;
    }
    throw new Error('Unsupported type of argument ' + JSON.stringify(importName));
};

var convertRelativePathToAbsolute = function convertRelativePathToAbsolute(filePath, importArray) {
    // remove moduleName
    var newPath = filePath.substr(filePath.lastIndexOf('/'));
    importArray.forEach(function (segment) {
        if (segment === '..') {
            newPath = newPath.substr(0, newPath.lastIndexOf('/'));
        } else {
            newPath = newPath.concat('/' + segment);
        }
    });
    return newPath;
};

var conditionallyFormatFilePath = function conditionallyFormatFilePath(currentFilename, currentImport) {
    var pathSegments = currentImport.split('/');
    if (pathSegments.includes('..')) {
        // in relative path
        var proposedAbsolutePath = convertRelativePathToAbsolute(currentFilename, pathSegments);
        currentImport = proposedAbsolutePath;
    }

    var prefixesToDelete = ['/', './'];
    prefixesToDelete.forEach(function (prefix) {
        currentImport = currentImport.startsWith(prefix) ? currentImport.substring(prefix.length, currentImport.length) : currentImport;
    });
    return currentImport;
};

var buildErrorMessage = function buildErrorMessage(imp) {
    var errorMsg = 'Module ' + imp.name + ' is deprecated.';
    if (imp.use) {
        errorMsg += ' Use ' + imp.use + ' instead.';
    }
    return errorMsg;
};

module.exports = {
    meta: {
        docs: {
            description: 'Forbids importing from given files.'
        }
    },
    create: function create(context) {
        var imports = {};
        context.options.map(makeImportObj).forEach(function (importObj) {
            imports[importObj.name] = importObj;
        });

        return {
            ImportDeclaration: function ImportDeclaration(node) {
                var filename = context.eslint ? context.eslint.getFilename() : context.getFilename();
                var importPath = conditionallyFormatFilePath(filename, node.source.value);

                if (!Object.entries(imports)) return;

                var imp = Object.entries(imports).filter(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 1),
                        importString = _ref2[0];

                    return importString.includes(importPath);
                }).map(function (_ref3) {
                    var _ref4 = _slicedToArray(_ref3, 2),
                        value = _ref4[1];

                    return value;
                }).shift();

                if (!imp) {
                    return;
                }

                context.report({ node: node, message: buildErrorMessage(imp) });
            },
            CallExpression: function CallExpression(node) {
                if (node.callee.name !== 'require' || !node.arguments.length) {
                    return;
                }
                var requireArg = node.arguments[0];
                if (requireArg.type !== 'Literal') {
                    return;
                }
                var imp = imports[requireArg.value];

                if (!imp) {
                    return;
                }
                context.report({ node: node, message: buildErrorMessage(imp) });
            }
        };
    }
};