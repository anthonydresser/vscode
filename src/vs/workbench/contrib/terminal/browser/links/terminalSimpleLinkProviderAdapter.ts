/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Terminal, IViewportRange, IBufferLine } from 'xterm';
import { getXtermLineContent, convertLinkRangeToBuffer } from 'vs/workbench/contrib/terminal/browser/links/terminalLinkHelpers';
import { TerminalLink } from 'vs/workbench/contrib/terminal/browser/links/terminalLink';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { TerminalBaseLinkProvider } from 'vs/workbench/contrib/terminal/browser/links/terminalBaseLinkProvider';
import { ITerminalExternalLinkProvider, ITerminalInstance } from 'vs/workbench/contrib/terminal/browser/terminal';

export class TerminalExternalLinkProviderAdapter extends TerminalBaseLinkProvider {

	constructor(
		private readonly _xterm: Terminal,
		private readonly _instance: ITerminalInstance,
		private readonly _externalLinkProvider: ITerminalExternalLinkProvider,
		private readonly _activateCallback: (event: MouseEvent | undefined, uri: string) => void,
		private readonly _tooltipCallback: (link: TerminalLink, viewportRange: IViewportRange, modifierDownCallback?: () => void, modifierUpCallback?: () => void) => void,
		@IInstantiationService private readonly _instantiationService: IInstantiationService
	) {
		super();
	}

	protected async _provideLinks(y: number): Promise<TerminalLink[]> {
		// TODO: Need to return async
		let startLine = y - 1;
		let endLine = startLine;

		const lines: IBufferLine[] = [
			this._xterm.buffer.active.getLine(startLine)!
		];

		while (this._xterm.buffer.active.getLine(startLine)?.isWrapped) {
			lines.unshift(this._xterm.buffer.active.getLine(startLine - 1)!);
			startLine--;
		}

		while (this._xterm.buffer.active.getLine(endLine + 1)?.isWrapped) {
			lines.push(this._xterm.buffer.active.getLine(endLine + 1)!);
			endLine++;
		}

		const lineContent = getXtermLineContent(this._xterm.buffer.active, startLine, endLine, this._xterm.cols);
		const externalLinks = await this._externalLinkProvider.provideLinks(this._instance, lineContent);
		if (!externalLinks) {
			return [];
		}

		// TODO: Add handling default handling of links via the target property
		return externalLinks.map(link => {
			const bufferRange = convertLinkRangeToBuffer(lines, this._xterm.cols, {
				startColumn: link.startIndex + 1,
				startLineNumber: 1,
				endColumn: link.startIndex + link.length + 1,
				endLineNumber: 1
			}, startLine);
			const matchingText = lineContent.substr(link.startIndex, link.length);
			return this._instantiationService.createInstance(TerminalLink, bufferRange, matchingText, this._xterm.buffer.active.viewportY, this._activateCallback, this._tooltipCallback, true, link.label);
		});
	}
}
