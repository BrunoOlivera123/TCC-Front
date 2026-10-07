// Ponto de entrada do front-end do SOS Car.

import './components/theme/tema.js';
import './utils/masks.js';
import './components/forms/alternarSenha.js';
import './components/common/feedbackBotao.js';
import './pages/profile/configuracoes.js';
import './pages/auth/recuperacaoSenha.js';
import { iniciar } from './core/boot.js';

iniciar();
