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

import './soc/soc-directory.html';
import './soc/soc-directory.js';
import './soc/soc-infos.html';
import './soc/soc-infos.js';
import './soc/new-publisher.html';
import './soc/new-publisher.js';
import './soc/edit-publisher.html';
import './soc/edit-publisher.js';

import './titres/titres-directory.html';
import './titres/titres-directory.js';
import './titres/titre-infos.html';
import './titres/titre-infos.js';
import './titres/new-titre.html';
import './titres/new-titre.js';
import './titres/edit-titre.html';
import './titres/edit-titre.js';

import './indexes/index-auteurs.html';
import './indexes/index-auteurs.js';
import './indexes/index-constructeurs.html';
import './indexes/index-constructeurs.js';


import './app-client.js'
import './popup-edit-title.html'
import './popup-edit-title.js'

//import './router.js'
assert = require('assert');


Meteor.startup(function () {
});
