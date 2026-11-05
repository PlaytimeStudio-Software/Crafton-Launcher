import type { Language } from 'highlight.js'

/*
Language: MCFunction
Author: FireBlast, Modrinth
Description: Highlight.js grammar for MCFunction
Category: scripting
*/
export default function (): Language {
	return {
		name: 'MCFunction',
		aliases: ['mcfunction'],
		case_insensitive: true,
		contains: [
			{
				className: 'comment',
				begin: /^\s*#>/,
				end: /$/,
				contains: [{ className: 'doctag', begin: /.+/ }],
				relevance: 10,
			},
			{
				className: 'comment',
				begin: /^\s*#!/,
				end: /$/,
				relevance: 10,
			},
			{
				className: 'comment',
				begin: /^\s*##/,
				end: /$/,
				relevance: 10,
			},
			{
				className: 'comment',
				begin: /^\s*#(?![a-z0-9_.]+:)/,
				end: /$/,
				relevance: 10,
			},
			{
				className: 'string',
				begin: /"/,
				end: /"|$/,
				illegal: /\n/,
				contains: [
					{
						className: 'char.escape',
						begin: /\\[\\"/bfnrt]/,
					},
					{
						className: 'variable',
						begin: /\$\([a-zA-Z0-9_]+\)/,
					},
				],
				relevance: 3,
			},
			{
				className: 'string',
				begin: /'/,
				end: /'|$/,
				illegal: /\n/,
				contains: [
					{
						className: 'char.escape',
						begin: /\\[\\'/bfnrt]/,
					},
					{
						className: 'variable',
						begin: /\$\([a-zA-Z0-9_]+\)/,
					},
				],
				relevance: 3,
			},
			{
				className: 'variable',
				begin: /\$\([a-zA-Z0-9_]+\)/,
				relevance: 8,
			},
			{
				className: 'literal',
				begin: /@[apers]\b/,
				relevance: 7,
			},
			{
				className: 'literal',
				begin: /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i,
				relevance: 6,
			},
			{
				className: 'symbol',
				begin: /#?[a-z0-9_.]+:[a-z0-9_.\/]+/,
				relevance: 5,
			},
			{
				begin: /[a-z]+=/,
				end: /[\],\{]/,
				contains: [
					{
						className: 'symbol',
						begin: /#?[a-z0-9_.]+:[a-z0-9_.\/]+/,
						relevance: 5,
					},
					{
						className: 'number',
						begin: /-?\d+(\.\d+)?/,
					},
					{
						className: 'literal',
						begin: /\b(true|false)\b/i,
					},
					{
						className: 'literal',
						begin: /\.\./,
					},
					{
						className: 'string',
						begin: /[a-z_0-9$]+/,
					},
				],
				relevance: 2,
			},
			{
				className: 'title',
				begin: /run /,
				end: / |$/,
				contains: [
					{
						className: 'keyword',
						begin: /[a-z_0-9$]+/,
					},
				],
				relevance: 5,
			},
			{
				className: 'number',
				begin: /[~^]-?(?:\d*\.)?\d+/,
				relevance: 3,
			},
			{
				className: 'operator',
				begin: /[~^]/,
				relevance: 2,
			},
			{
				className: 'number',
				variants: [{ begin: /-?(?:\d*\.)?\d+[bdfils]\b/i }, { begin: /-?(?:\d*\.)?\d+\b/ }],
				relevance: 0,
			},
			{
				className: 'literal',
				begin: /\.\./,
				relevance: 1,
			},
			{
				className: 'literal',
				begin: /\b(true|false)\b/i,
				relevance: 1,
			},
			{
				className: 'keyword',
				begin: /^\s*[a-z]+/,
				relevance: 0,
			},
		],
	}
}
