/* eslint-env jest */
import { buildParticipantImageId } from '@/lib/participantThumbnails';
import {
	sanitizeAttachmentIdSegment,
	sanitizeAudioFileName,
	sanitizeUnrealIdentifier,
} from '@/lib/assetNaming';

describe('assetNaming', () => {
	test('sanitizes identifiers to Unreal-safe tokens', () => {
		expect(sanitizeUnrealIdentifier(' Ask for Work ')).toBe('Ask_for_Work');
		expect(sanitizeUnrealIdentifier('český název')).toBe('cesky_nazev');
		expect(sanitizeUnrealIdentifier('***')).toBe('Asset');
	});

	test('sanitizes attachment segments with fallback', () => {
		expect(sanitizeAttachmentIdSegment('A/B>C D')).toBe('A_B_C_D');
		expect(sanitizeAttachmentIdSegment('', 'Unknown')).toBe('Unknown');
	});

	test('sanitizes audio file names while preserving extension', () => {
		expect(sanitizeAudioFileName('Ask for Work.wav')).toBe('Ask_for_Work.wav');
		expect(sanitizeAudioFileName('Můj zvuk.MP3')).toBe('Muj_zvuk.mp3');
		expect(sanitizeAudioFileName('  ???.wav  ')).toBe('Audio.wav');
		expect(sanitizeAudioFileName('name with no ext')).toBe('name_with_no_ext');
	});

	test('buildParticipantImageId uses sanitized category and name', () => {
		expect(
			buildParticipantImageId({
				participantName: 'Žoldák Hero',
				categoryPath: 'Main/Characters > Tier 1',
			})
		).toBe('T_Main_Characters_Tier_1_Zoldak_Hero_Thumbnail');
	});
});
