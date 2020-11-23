We need to add the ownerDpnsDocId to every contract because the identityId is ambivalent across multiple nameLabels and the nameLabels can be transferred to other identities. To not mix up who owns and asset BY NAME the dpns $docId must be attached to every asset document.


Do you need to create an index for $ownerId ?

Create a contract for additional indices ?


For pvt key encrypted docs (like DM) we'll use requestdoc flow, for plain text docs, delegate flow,
we might want to put a field in a doc indicating which flow dApp browser should use

We might want a xpub key published for each dApp to enable dApp specific assets