# sunory-store — contexte pour Claude

Images des stores de Sunory, hors du dépôt de l'app pour ne pas l'alourdir. Le mode vitrine qui
produit les captures est dans `sunory` (`src/features/showcase/`). Le `README.md` décrit le dossier
et les deux commandes (`yarn push-photos`, `yarn compose`).

- Réponses en français ; code, commentaires et messages de commit en anglais.
- **Commits** : `git -c user.name="Nicolas Coulon" -c user.email="ncoulon75@gmail.com" commit`.
  Jamais de `Co-Authored-By`, de lien de session ni de mention d'un assistant.
- Pas de branche obligatoire ici : les images se poussent sur `main`, une fois validées.
- Les captures (`screens/`) viennent du simulateur du propriétaire ; on ne les retouche pas, on
  corrige le mode vitrine dans l'app et on les refait.
- Les tailles d'Apple changent : vérifier la page « Screenshot specifications » d'App Store
  Connect avant d'ajouter ou de retirer une taille dans `CANVASES`.
