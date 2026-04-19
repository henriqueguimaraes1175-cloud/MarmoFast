
export const cloudService = {
  sync: async (data: unknown) => {
    console.log("Sincronizando com a nuvem...", data);
    return true;
  }
};
