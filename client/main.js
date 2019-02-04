import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';
import './global-helpers.js'
import './auteurs/auteurs-directory.html';
import './auteurs/auteurs-directory.js';
import './auteurs/auteur-infos.html';
import './auteurs/auteur-infos.js';
import './auteurs/auteur-new.html';
import './auteurs/auteur-new.js';

import './constructeurs/constructeurs-directory.html';
import './constructeurs/constructeurs-directory.js';
import './constructeurs/constructeur-infos.html';
import './constructeurs/constructeur-infos.js';
import './constructeurs/new-publisher.html';
import './constructeurs/new-publisher.js';
import './constructeurs/edit-publisher.html';
import './constructeurs/edit-publisher.js';
import './constructeurs/title-popup.html'
import './constructeurs/title-popup.js'

import './titres/titres-directory.html';
import './titres/titres-directory.js';
import './titres/titre-infos.html';
import './titres/titre-infos.js';
import './titres/new-titre.html';
import './titres/new-titre.js';
import './titres/edit-titre.html';
import './titres/edit-titre.js';

import './admin/admin.js';
import './admin/admin.html';

import './indexes/index-auteurs.html';
import './indexes/index-auteurs.js';

import './indexes/index-constructeurs.html';
import './indexes/index-constructeurs.js';

import './indexes/index-marques.html';
import './indexes/index-marques.js';

import './indexes/index-s3.html';
import './indexes/index-s3.js';

import './app-client.js'

//import './router.js'
assert = require('assert');


Meteor.startup(function () {
});
