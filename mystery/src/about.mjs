import readme from '../../README.md';
import {renderReadme} from './readme.mjs';

export const aboutText={zh:renderReadme(readme,'zh'),en:renderReadme(readme,'en')};
