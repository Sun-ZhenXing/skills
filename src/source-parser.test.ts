import { describe, it, expect } from 'vitest';
import { parseSource } from './source-parser.js';

describe('source-parser', () => {
  describe('GitLab Custom Domains & Subgroups', () => {
    it('parses custom gitlab domain with deep subgroup paths', () => {
      const result = parseSource('https://git.corp.com/group/subgroup/project/-/tree/main/src');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://git.corp.com/group/subgroup/project.git',
        ref: 'main',
        resolvedRef: 'main',
        subpath: 'src',
      });
    });

    it('parses gitlab tree with branch but no path', () => {
      const result = parseSource('https://gitlab.example.com/org/repo/-/tree/v1.0');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://gitlab.example.com/org/repo.git',
        ref: 'v1.0',
        resolvedRef: 'v1.0',
      });
    });

    it('parses custom gitlab domain with port number', () => {
      const result = parseSource('https://git.corp.com:8443/group/repo/-/tree/main');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'https://git.corp.com:8443/group/repo.git',
        ref: 'main',
      });
    });

    it('parses http protocol (non-ssl)', () => {
      const result = parseSource('http://git.local/group/repo/-/tree/dev');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'http://git.local/group/repo.git',
      });
    });

    it('parses personal project path (~user)', () => {
      const result = parseSource('https://gitlab.com/~user/project/-/tree/main');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'https://gitlab.com/~user/project.git',
      });
    });
  });

  describe('Simplified Git Strategy', () => {
    it('treats custom domains with .git as generic git', () => {
      const result = parseSource('https://git.mycompany.com/my-group/my-repo.git');
      expect(result).toEqual({
        type: 'git',
        url: 'https://git.mycompany.com/my-group/my-repo.git',
      });
    });

    it('extracts #ref from generic git URL and normalizes source URL', () => {
      const result = parseSource('https://git.mycompany.com/my-group/my-repo.git#release/v2');
      expect(result).toEqual({
        type: 'git',
        url: 'https://git.mycompany.com/my-group/my-repo.git',
        ref: 'release/v2',
        declaredRef: 'release/v2',
        resolvedRef: 'release/v2',
      });
    });

    it('extracts ref query parameter from generic git URL', () => {
      const result = parseSource('https://git.mycompany.com/my-group/my-repo.git?ref=main');
      expect(result).toEqual({
        type: 'git',
        url: 'https://git.mycompany.com/my-group/my-repo.git',
        ref: 'main',
        declaredRef: 'main',
        resolvedRef: 'main',
      });
    });

    it('extracts #ref from scp-like ssh locator', () => {
      const result = parseSource('git@git.mycompany.com:my-group/my-repo.git#feature/test');
      expect(result).toEqual({
        type: 'git',
        url: 'git@git.mycompany.com:my-group/my-repo.git',
        ref: 'feature/test',
        declaredRef: 'feature/test',
        resolvedRef: 'feature/test',
      });
    });

    it('does NOT extract trailing @ref from generic HTTPS git URL (@ref no longer supported)', () => {
      const result = parseSource('https://git.mycompany.com/my-group/my-repo.git@release/v3');
      // @ref is not extracted as Git ref; use #ref instead
      expect(result.ref).toBeUndefined();
    });

    it('does NOT extract trailing @ref from scp-like ssh locator (@ref no longer supported)', () => {
      const result = parseSource('git@git.mycompany.com:my-group/my-repo.git@feature/test');
      // @ref is not extracted as Git ref; the whole string becomes the URL
      expect(result.ref).toBeUndefined();
    });

    it('prevents false positives for generic URLs (falls through to well-known)', () => {
      const result = parseSource('https://google.com/search/result');
      expect(result.type).toBe('well-known');
      expect(result.url).toBe('https://google.com/search/result');
    });

    it('retains official gitlab.com parsing for convenience', () => {
      const result = parseSource('https://gitlab.com/owner/repo');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://gitlab.com/owner/repo.git',
      });
    });
  });

  describe('Existing GitHub Support', () => {
    it('parses github shorthand', () => {
      const result = parseSource('vercel-labs/agent-skills');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/vercel-labs/agent-skills.git',
        subpath: undefined,
      });
    });

    it('parses github full URL', () => {
      const result = parseSource('https://github.com/owner/repo/tree/main/path');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo.git',
        ref: 'main',
        resolvedRef: 'main',
        subpath: 'path',
      });
    });

    it('parses github repo URL with trailing #ref suffix', () => {
      const result = parseSource('https://github.com/owner/repo.git#v1.2.3');
      expect(result).toMatchObject({
        url: 'https://github.com/owner/repo.git',
        ref: 'v1.2.3',
        declaredRef: 'v1.2.3',
        resolvedRef: 'v1.2.3',
      });
    });

    it('does NOT extract @ref from github repo URL (breaking change: use #ref)', () => {
      const result = parseSource('https://github.com/owner/repo.git@v1.2.3');
      expect(result.ref).toBeUndefined();
    });

    it('keeps @skill shorthand priority over generic git ref parsing', () => {
      const result = parseSource('owner/repo@my-skill');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo.git',
        skillFilter: 'my-skill',
      });
    });

    it('parses owner/repo#ref shorthand syntax', () => {
      const result = parseSource('owner/repo#v1.0.0');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo.git',
        ref: 'v1.0.0',
        declaredRef: 'v1.0.0',
        resolvedRef: 'v1.0.0',
      });
    });
  });
});
